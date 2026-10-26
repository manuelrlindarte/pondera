# Pondera

Pondera ofrece revisiones financieras independientes para personas que están por comprar un negocio pequeño en traspaso en Bogotá: restaurantes, panaderías, tiendas de barrio, gimnasios y servicios.

Este repositorio contiene la presencia digital del servicio: la landing, la calculadora de recuperación y el sistema para recibir y gestionar solicitudes.

## El problema

En un traspaso de COP 50 a 300 millones, el comprador suele invertir sus ahorros o un crédito basándose en lo que dice el vendedor. Normalmente le muestran un cuaderno de ventas, unos extractos y una frase como "deja 8 millones limpios al mes". Casi nunca hay estados financieros auditados.

Las firmas de due diligence atienden empresas formales y no trabajan operaciones de este tamaño. El contador conocido lleva libros, pero no verifica si lo que afirma el vendedor es cierto. El resultado es que la mayoría de compradores decide sin que nadie de su lado revise los números.

## El servicio

Pondera hace una revisión del lado del comprador, con alcance y precio fijos, y la entrega en 3 a 5 días. El informe incluye:

- Ventas y gastos declarados comparados con soportes: extractos, datáfonos, facturas, declaraciones e inventario.
- Utilidad ajustada, incluyendo el sueldo del dueño y sin gastos personales ni ventas sin soporte.
- Señales de alerta: inconsistencias, dependencia del dueño actual, condiciones del arriendo y deudas visibles.
- Meses de recuperación de la inversión en escenarios conservador, base y optimista.
- Preguntas para el vendedor y argumentos para negociar el precio.

Se cobra se cierre o no la compra, para que el incentivo sea decir la verdad y no que la venta ocurra. No recibimos comisiones de vendedores ni de corredores.

| Plan | Tamaño del traspaso | Precio (COP) |
| --- | --- | --- |
| Esencial | Hasta 80 M | 800.000 |
| Completo | 80 a 200 M | 1.300.000 |
| Ampliado | Más de 200 M o varios locales | Desde 2.000.000 |

Los precios son hipótesis de la fase de validación.

## Cómo llegan los clientes

1. **Referidos** de abogados que redactan contratos de traspaso, contadores de pequeños negocios y asesores de crédito para pymes.
2. **Grupos y clasificados** donde se publican traspasos, con una checklist gratuita como imán.
3. **Contenido** con casos anonimizados que responde búsquedas como "cómo saber si un negocio que me venden es rentable".

La calculadora de la landing es la puerta de entrada. El comprador ingresa lo que le dijo el vendedor, ve la recuperación ajustada y, si los números no cuadran, solicita la revisión.

## Estado del proyecto

Fase de validación, sin clientes todavía. La meta de los primeros 90 días es entregar 5 revisiones (al menos 3 pagas) y activar 3 referidores.

## Qué incluye este repositorio

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
