// Pondera — backend: landing, calculadora, solicitudes (leads) y panel de administración.
// Requiere Node 22.13+ (usa el módulo nativo node:sqlite, sin dependencias nativas).
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pondera.db');
const MARGIN = 0.35; // margen de contribución supuesto sobre ventas sin soporte (igual que el front)

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    nombre TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT,
    tipo TEXT,
    rango TEXT,
    plazo TEXT,
    detalle TEXT,
    calc_json TEXT,
    estado TEXT NOT NULL DEFAULT 'nuevo',
    notas TEXT
  );
`);
const ESTADOS = ['nuevo', 'contactado', 'admision', 'propuesta', 'pagado', 'entregado', 'descartado'];

// --- Lógica de negocio --------------------------------------------------------
function calcular({ precio = 0, ventas = 0, utilidad = 0, pct = 100, sueldo = 0 }) {
  const n = (v) => Math.max(0, Number(v) || 0);
  precio = n(precio); ventas = n(ventas); utilidad = n(utilidad); sueldo = n(sueldo);
  pct = Math.min(100, Math.max(0, Number(pct) || 0));
  const sinSoporte = ventas * (1 - pct / 100);
  const ajustada = utilidad - sinSoporte * MARGIN - sueldo;
  const meses = (u) => (u > 0 ? +(precio / u).toFixed(1) : null);
  return {
    supuestos: { margenContribucion: MARGIN },
    ventasSinSoporte: Math.round(sinSoporte),
    utilidadAjustada: Math.round(ajustada),
    recuperacionDeclaradaMeses: meses(utilidad),
    recuperacionAjustadaMeses: meses(ajustada),
    alerta: ajustada <= 0 ? 'sin_utilidad' : precio / ajustada > 36 ? 'recuperacion_larga' : 'ok',
  };
}

// --- App -------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Seguridad básica de cabeceras
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// La landing se escribe como fragmento (formato de Artifact); aquí se envuelve en un documento completo.
const SKELETON_HEAD = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>';
function sendPage(file) {
  return (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, 'public', file), 'utf8');
    res.type('html').send(SKELETON_HEAD + html + '</body></html>');
  };
}
app.get('/', sendPage('landing.html'));

// Límite simple de envíos por IP (10 por hora)
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (arr.length >= 10) return res.status(429).json({ error: 'Demasiadas solicitudes desde esta conexión' });
  arr.push(now); hits.set(ip, arr); next();
}

const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

app.post('/api/calcular', (req, res) => res.json(calcular(req.body || {})));

app.post('/api/leads', rateLimit, (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot anti-spam
  const nombre = clip(b.nombre, 120);
  const whatsapp = clip(b.whatsapp, 30);
  const email = clip(b.email, 160);
  if (!nombre || whatsapp.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ error: 'Faltan el nombre o un WhatsApp válido' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido' });
  }
  let calc = null;
  if (b.calculadora && typeof b.calculadora === 'object') {
    calc = JSON.stringify({ entrada: b.calculadora, resultado: calcular(b.calculadora) });
  }
  const r = db.prepare(
    'INSERT INTO leads (nombre, whatsapp, email, tipo, rango, plazo, detalle, calc_json) VALUES (?,?,?,?,?,?,?,?)'
  ).run(nombre, whatsapp, email, clip(b.tipo, 60), clip(b.rango, 60), clip(b.plazo, 60), clip(b.detalle, 1000), calc);
  res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
});

// --- Admin (HTTP Basic, usuario "admin") ---------------------------------------
function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).send('Configura la variable ADMIN_PASSWORD para activar el panel.');
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  const pass = scheme === 'Basic' && token ? Buffer.from(token, 'base64').toString().split(':').slice(1).join(':') : '';
  const a = Buffer.from(pass), b = Buffer.from(ADMIN_PASSWORD);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.set('WWW-Authenticate', 'Basic realm="Pondera admin"').status(401).send('Autenticación requerida');
}

app.get('/admin', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/api/admin/leads', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all();
  res.json({ estados: ESTADOS, leads: rows.map((r) => ({ ...r, calc: r.calc_json ? JSON.parse(r.calc_json) : null, calc_json: undefined })) });
});

app.patch('/api/admin/leads/:id', requireAdmin, (req, res) => {
  const { estado, notas } = req.body || {};
  if (estado && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado no válido' });
  const cur = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
  if (!cur) return res.status(404).json({ error: 'Solicitud no encontrada' });
  db.prepare('UPDATE leads SET estado = ?, notas = ? WHERE id = ?').run(
    estado || cur.estado, notas !== undefined ? clip(notas, 2000) : cur.notas, cur.id
  );
  res.json({ ok: true });
});

app.get('/api/admin/leads.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, created_at, nombre, whatsapp, email, tipo, rango, plazo, estado, detalle, notas FROM leads ORDER BY id DESC').all();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cols = Object.keys(rows[0] || { id: 0 });
  res.type('text/csv').attachment('solicitudes-pondera.csv')
    .send([cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n'));
});

app.get('/health', (req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Pondera escuchando en http://localhost:${PORT}`));
}
module.exports = { app, calcular };
