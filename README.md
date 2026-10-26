# Pondera

Landing, calculadora de recuperación y gestión de solicitudes para el servicio de revisión financiera precompra de negocios.

## Qué incluye

- `public/landing.html`: la landing (hero con informe de ejemplo, calculadora, método, planes, comparación, preguntas y formulario).
- `public/admin.html`: panel privado para ver solicitudes, cambiar su estado, tomar notas y exportar CSV.
- `server.js`: backend en Express con base de datos SQLite nativa de Node (sin dependencias que compilar).

## Correr en local

Requiere Node 22.13 o superior.

```bash
npm install
ADMIN_PASSWORD=tu-clave npm start
```

- Landing: http://localhost:3000
- Panel: http://localhost:3000/admin (usuario `admin`, clave la de `ADMIN_PASSWORD`)

## Variables de entorno

| Variable | Uso | Valor por defecto |
| --- | --- | --- |
| `PORT` | Puerto del servidor | 3000 |
| `ADMIN_PASSWORD` | Clave del panel. Sin ella el panel queda desactivado | — |
| `DB_PATH` | Ruta del archivo SQLite | `data/pondera.db` |

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/calcular` | Recibe `precio, ventas, utilidad, pct, sueldo` y devuelve utilidad ajustada y meses de recuperación |
| POST | `/api/leads` | Guarda una solicitud. Valida nombre y WhatsApp, limita a 10 envíos por hora por IP y tiene campo trampa anti-spam |
| GET | `/api/admin/leads` | Lista solicitudes (requiere clave) |
| PATCH | `/api/admin/leads/:id` | Cambia `estado` o `notas` (requiere clave) |
| GET | `/api/admin/leads.csv` | Exporta solicitudes a CSV (requiere clave) |

Estados del embudo: nuevo, contactado, admision, propuesta, pagado, entregado, descartado.

## Supuesto de la calculadora

Las ventas sin soporte se descuentan con un margen de contribución del 35 %, y se resta el sueldo de reemplazo del dueño si trabaja en el negocio. La constante `MARGIN` está en `server.js` y en el script de la landing; si la cambias, cámbiala en los dos.

## Publicar

Funciona en cualquier servicio que corra Node (Railway, Render, Fly.io). Configura `ADMIN_PASSWORD` y un disco persistente montado en la ruta de `DB_PATH` para no perder solicitudes en cada despliegue.

## Pendiente antes de lanzar

- Verificar disponibilidad del nombre y dominio, y registrar la marca.
- Reemplazar los casos ilustrativos por casos reales con permiso del cliente.
- Política de tratamiento de datos personales (Ley 1581 de 2012) enlazada desde el formulario.
- Notificación por WhatsApp o correo cuando entra una solicitud.
