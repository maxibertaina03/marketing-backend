# Contrato de API — Centro de IA (Fase 2)

Acuerdo entre **masita** (IA de Contenido) y **capitán** (IA Estratégica / Campañas)
para no pisarse rutas ni formatos. Se construye todo sobre `ServicioIa.generar`
(módulo `ia`, ya en `develop`).

## Convenciones compartidas (las cumplen los dos)

1. **Namespaces de ruta** (sin choques):
   - masita → `/api/ia-contenido/*`
   - capitán → `/api/ia-estrategia/*` y `/api/ia-campanas/*`
2. **Envelope de respuesta de todo botón** = lo que devuelve `ServicioIa.generar`:
   ```jsonc
   {
     "generacionId": "clx...",        // fila GeneracionIa (trazabilidad)
     "salida": { /* según el botón */ },
     "modelo": "claude-opus-4-8",
     "tokens": { "entrada": 0, "salida": 0, "cacheCreacion": 0, "cacheLectura": 0 }
   }
   ```
3. **Input común** de los botones: `clienteId` (obligatorio, aporta el contexto de
   marca), `estrategiaId?` (opcional; si falta se usa la más reciente del cliente),
   `red?` (opcional).
4. **Paginado de bibliotecas**: `{ total, pagina, limite, items }`.
5. **Roles**: generar → `ADMIN`, `COMMUNITY_MANAGER`, `COPYWRITER`. Leer bibliotecas → cualquier miembro.

---

## masita — IA de Contenido (`/api/ia-contenido`)

### Generación (POST)

| Ruta | Body | `TipoBotonIa` | `salida` |
|---|---|---|---|
| `/ideas` | `{ clienteId, estrategiaId?, red?, cantidad?=5, tema? }` | `IDEAS_CONTENIDO` | `{ ideas: [{ titulo, formato, descripcion, pilar? }] }` |
| `/hooks` | `{ clienteId, estrategiaId?, red?, tema*, cantidad?=5 }` | `HOOKS` | `{ hooks: string[] }` |
| `/carrusel` | `{ clienteId, estrategiaId?, red?, tema*, cantidadSlides?=6 }` | `CARRUSEL` | `{ titulo, slides: [{ titulo, texto }], pieDeFoto, hashtags: string[] }` |
| `/copy` | `{ clienteId, estrategiaId?, red?, brief*, cta? }` | `COPYWRITING` | `{ texto, hashtags: string[], cta }` |

`*` = obligatorio.

### Lectura (GET)

| Ruta | Query | Devuelve |
|---|---|---|
| `/biblioteca` | `clienteId?`, `tipoBoton?`, `pagina?=1`, `limite?=20` | `{ total, pagina, limite, items: GeneracionIa[] }` |

Sin `tipoBoton`, lista los tipos de contenido (`IDEAS_CONTENIDO`, `HOOKS`, `CARRUSEL`, `COPYWRITING`).

---

## capitán — IA Estratégica / Campañas (a completar)

> Capi: completá acá tus rutas + body + `salida`, siguiendo las convenciones de arriba.

### `/api/ia-estrategia` — botones `ESTRATEGIA_MENSUAL`, `FODA`, `BUYER_PERSONA`, `PILARES`
_(pendiente)_

### `/api/ia-campanas` — botón `CAMPANA` + Biblioteca de Campañas
_(pendiente)_

### Banco de Ideas
_(pendiente — definir si es lectura de `GeneracionIa` por tipo, como la Biblioteca de Contenido)_
