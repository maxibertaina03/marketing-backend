# Contrato — Métricas (Fase 4)

Base de datos de métricas que ingesta la integración con Meta (slice masita) y que
consumen la **IA de Métricas** y los **Informes Automáticos** (slice capitán).

## Entidad `MetricaPublicacion`

Un snapshot **diario** de métricas por publicación. Único por `(publicacionId, fecha)` →
re-ingestar el mismo día actualiza la fila.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | cuid |
| `organizacionId` | string | multi-tenant |
| `clienteId` | string | marca (derivado de la publicación) |
| `publicacionId` | string | FK |
| `canal` | `Canal` | enum (INSTAGRAM, FACEBOOK, …) — derivado de la publicación |
| `fecha` | date | día del snapshot |
| `impresiones` | int | |
| `alcance` | int | |
| `meGusta` | int | |
| `comentarios` | int | |
| `compartidos` | int | |
| `guardados` | int | |
| `clics` | int | |

`interacciones` (campo derivado en los resúmenes) = `meGusta + comentarios + compartidos + guardados`.

## Endpoints (`/api/metricas`)

| Método | Ruta | Roles | Para qué |
|---|---|---|---|
| `POST` | `/ingestar` | ADMIN, CM | Ingesta un lote (lo llamará la integración Meta). |
| `GET` | `/` | ADMIN, CM, ANALISTA | **Métricas crudas** (filtros: `clienteId`, `publicacionId`, `desde`, `hasta`). |
| `GET` | `/resumen` | ADMIN, CM, ANALISTA | **Resumen agregado** de un cliente. |
| `POST` | `/simular` | ADMIN | Genera datos de prueba para un cliente (mientras no esté Meta). |

### Lo que consumís vos (capitán)
Para **IA de Métricas** e **Informes**, leé:

- **`GET /metricas?clienteId=&desde=&hasta=`** → `MetricaPublicacion[]` (crudas, para mandarlas/analizarlas).
- **`GET /metricas/resumen?clienteId=&desde=&hasta=`** → ya agregado:

```jsonc
{
  "clienteId": "…",
  "desde": "2026-06-01", "hasta": "2026-06-30",
  "totales": {
    "impresiones": 0, "alcance": 0, "meGusta": 0, "comentarios": 0,
    "compartidos": 0, "guardados": 0, "clics": 0,
    "interacciones": 0, "publicaciones": 0
  },
  "porCanal": [{ "canal": "INSTAGRAM", "impresiones": 0, "alcance": 0, "interacciones": 0 }],
  "serie":    [{ "fecha": "2026-06-01", "impresiones": 0, "alcance": 0, "interacciones": 0 }]
}
```

Sugerencia: para la **IA de Métricas**, armá el contexto con el `/resumen` (totales + porCanal +
serie) y pasáselo a `ServicioIa.generar` con `tipoBoton: ANALISIS_METRICAS` (ya está en el enum).
Para **Informes**, el mismo resumen es la base del documento.

## Para probar sin Meta
`POST /metricas/simular { clienteId, dias? }` puebla métricas de prueba para todas las
publicaciones del cliente. El Dashboard tiene un botón "Generar datos de prueba" que lo llama.

## Pendiente (no bloquea tu trabajo)
- La **ingesta real de Meta** (OAuth + Graph API) la implemento yo; hasta entonces, todo corre
  con datos de `simular`. El **contrato de arriba no cambia** cuando llegue Meta — solo se
  empieza a poblar `/ingestar` con datos reales.
