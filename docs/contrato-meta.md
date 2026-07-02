# Contrato — Integración con Meta (Instagram/Facebook)

Módulo `meta` (slice de masita, Fase 4). Conecta la cuenta de Instagram Business de un
cliente vía OAuth (Facebook Login) y trae **métricas reales** hacia `MetricaPublicacion`
(el mismo modelo que ya consumen el Dashboard, la IA de Métricas y los Informes).

## Variables de entorno (backend)

Usa la **API de Instagram con Instagram Login** (la nueva de Meta): login directo con la
cuenta de Instagram Business/Creator, **sin Página de Facebook**.

| Variable | Descripción |
|---|---|
| `META_IG_APP_ID` | Identificador de la app **de Instagram** (App → API de Instagram → Configuración de la API con inicio de sesión de Instagram). |
| `META_IG_APP_SECRET` | Clave secreta de la app de Instagram (🔒). |
| `META_REDIRECT_URI` | URL del callback. **Debe** coincidir con la registrada en *API de Instagram → Configuración del inicio de sesión de la empresa → URI de redireccionamiento de OAuth válidos*. En prod: `https://contentos-backend-0qns.onrender.com/api/meta/callback`. |
| `ORIGEN_FRONTEND` | Base del front para volver tras el OAuth (ya existía). |

Permisos solicitados: `instagram_business_basic`, `instagram_business_manage_insights`.

## Endpoints

Todos bajo `/api/meta`. Requieren sesión salvo el `callback` (lo invoca Meta).

| Método | Ruta | Roles | Qué hace |
|---|---|---|---|
| `GET` | `/conectar?clienteId=` | ADMIN, CM | Devuelve `{ url }`: el front la abre para que el usuario autorice. |
| `GET` | `/callback?code=&state=` | público | Meta redirige acá. Guarda la conexión y **redirige al front** a `/clientes/:id?meta=conectado` (o `meta=error` / `meta=sin_instagram`). |
| `GET` | `/estado?clienteId=` | ADMIN, CM, ANALISTA | `{ conectado, igUsername?, pageNombre?, ultimaSync?, tokenExpiraEn? }`. |
| `POST` | `/sincronizar` `{ clienteId }` | ADMIN, CM | Trae los últimos medios + insights y los guarda como snapshot de hoy. Devuelve `{ medios, sincronizadas }`. |
| `DELETE`| `/conexion?clienteId=` | ADMIN, CM | Borra la conexión. |

## Flujo

1. **Conectar**: el front llama `GET /conectar` y abre la `url` → el usuario autoriza en
   Facebook → Meta vuelve a `/callback` → se guarda `ConexionMeta` (Página + cuenta de IG +
   token de larga duración) → redirige al front.
2. **Sincronizar**: `POST /sincronizar` recorre los medios de Instagram, crea una
   `Publicacion` por cada uno que no exista (vinculada por `metaMediaId`) y hace `upsert` de
   sus métricas en `MetricaPublicacion` (snapshot por día). Después, el Dashboard ya muestra
   datos reales. Puede llamarse a mano o desde un job programado.

## Pendiente para producción

- Registrar el **Valid OAuth Redirect URI** en la app de Meta.
- La cuenta de IG debe ser **Business/Creator** vinculada a una **Página de Facebook**.
- Para conectar cuentas de terceros (clientes): **App Review** + **verificación de negocio**
  de Meta. En modo desarrollo funciona con las cuentas propias (admin/tester de la app).
