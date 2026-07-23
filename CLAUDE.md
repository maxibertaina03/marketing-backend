# CLAUDE.md — marketing-backend (ContentOS)

Contexto para Claude Code. Léelo antes de trabajar en este repo.

## Qué es

Backend de **ContentOS**, una plataforma SaaS **multi-tenant** para community managers y
agencias de marketing. Stack: **NestJS 11 + TypeScript + Prisma + PostgreSQL**, autenticación
con **Clerk**, IA con **Claude (Anthropic)** a partir de la Fase 2.

El frontend está en un repo separado: `marketing-frontend`.

## Convención de nomenclatura (OBLIGATORIA)

**Todo el código se nombra en español**: carpetas, módulos, archivos, clases, entidades,
variables, constantes, funciones, rutas de API y campos de base de datos. En inglés solo:
palabras clave del lenguaje/framework, paquetes npm de terceros y APIs externas (Clerk, Meta,
Anthropic).

- Clases/entidades: `PascalCase` (`EstrategiaDeMarca`)
- Variables/funciones: `camelCase` (`organizacionId`)
- Constantes y valores de enum: `UPPER_SNAKE_CASE` (`EstadoContenido.EN_REVISION`)
- Carpetas/archivos: `kebab-case` (`estrategia-marca`)

## Arquitectura

- Un **módulo NestJS por dominio** dentro de `src/` (ej. `clientes/`, `contenido/`).
- **Prisma** es el ORM. El schema vive en `prisma/schema.prisma`. `PrismaService` es global.
- **Multi-tenancy por `organizacionId`**: toda entidad de negocio cuelga de una `Organizacion`.
  Siempre filtrá las consultas por el `organizacionId` del contexto. Nunca devuelvas datos de
  otra organización.
- **Autenticación**: `GuardAutenticacion` (global) valida el JWT de Clerk contra las JWKS,
  provisiona el `Usuario` y resuelve la organización activa (header `x-organizacion-id`).
  Deja el contexto en `request.contexto` y el usuario en `request.usuario`.
- **Autorización**: en rutas que operan dentro de una organización usá
  `@UseGuards(GuardRoles)` + `@Roles(...)`. Roles: `ADMIN`, `COMMUNITY_MANAGER`, `DISENADOR`,
  `COPYWRITER`, `ANALISTA`, `CLIENTE`.
- **Decoradores** disponibles: `@OrgActual()`, `@UsuarioActual()`, `@ContextoActual()`,
  `@Roles(...)`, `@Publico()`.
- **DTOs** con `class-validator` en cada endpoint. **Swagger** (`@nestjs/swagger`) documenta la
  API en `/api/docs` — es el contrato con el frontend, mantenelo actualizado.

## Patrón para un módulo nuevo de dominio

Mirá `src/organizaciones/` como referencia. Un módulo típico tiene:
`<dominio>.module.ts`, `<dominio>.controller.ts`, `<dominio>.service.ts`, `dto/`. El service
recibe siempre el `organizacionId` y filtra por él. Registrá el módulo en `app.module.ts`.

## Cómo correr

```bash
npm install
cp .env.example .env          # completar CLERK_JWKS_URL, CLERK_ISSUER (pedírselos a masita)
npm run db:up                 # PostgreSQL con Docker
npm run prisma:migrate        # aplica el schema
npm run dev                   # API en http://localhost:3000/api, Swagger en /api/docs
```

Requiere **Node 20+**. Antes de abrir un PR: `npm run lint`, `npm run build`, `npm test`.

## Flujo de ramas

`main` (producción) ← `develop` (integración) ← `masita/*` y `capitan/*` (trabajo).
Trabajá siempre desde `develop`:

```bash
git checkout develop && git pull
git checkout -b capitan/<feature>     # o masita/<feature>
# ... cambios ...
git push -u origin capitan/<feature>  # y abrís PR hacia develop, lo revisa el otro
```

Nunca commitees `.env` ni `node_modules` (ya están en `.gitignore`).

## Reparto del trabajo por fase

- **masita**: Fase 1 `clientes` + `equipo`; Fase 2 módulo `ia` (infra) + IA de Contenido +
  Biblioteca de Copys; Fase 3 `produccion` + `archivos`; Fase 4 integraciones Meta + dashboard
  por cliente; Fase 5 producción+calendario (#3), archivos multimedia (#5), permisos ver/editar +
  Configuración (#6), navegación por cliente infra (#8), auto-posteo (#7).
- **capitan**: Fase 1 `estrategia-marca` + `contenido` (calendario); Fase 2 IA Estratégica +
  IA de Campañas + Banco de Ideas + Biblioteca de Campañas; Fase 3 `aprobaciones` +
  `portal-cliente`; Fase 4 IA de Métricas + Informes + Automatizaciones; Fase 5 IA Oportunidades de
  Crecimiento (#1), salidas de IA legibles (#2), aprobaciones kanban (#4), filtro por cliente (#8).

Fases 1-4 completas y en producción. **Fase 5 = iteración post-testers**; el detalle está en
`docs/PLAN.md`.

Antes de cada fase se acuerda el **contrato de API** (DTOs + rutas en Swagger) para no pisarse.
El plan completo lo tiene masita; pedíselo si necesitás el detalle.

## Centro de IA — Fase 2 (módulo `ia`)

El módulo `ia` (`src/ia/`) es la base de la Fase 2. Expone **`ServicioIa`** y NUNCA se
llama a la IA desde el front (la `ANTHROPIC_API_KEY` vive solo en el backend). El modelo
por defecto en el código es `claude-opus-4-8`, pero **en producción `MODELO_IA` está puesto
en `claude-haiku-4-5`**: es el que realmente atiende todos los botones hoy.

**Patrón "botón = endpoint = salida estructurada" (no chat):** cada botón de IA es un
endpoint que arma el contexto real de la marca y devuelve **JSON validable**. Por dentro,
`ServicioIa` fuerza una herramienta cuyo `input_schema` es tu esquema, marca el contexto de
marca con `cache_control` y **persiste cada generación** (`GeneracionIa`: entrada, salida,
modelo, tokens) para trazabilidad y Banco de Ideas.

**El caché todavía no ahorra nada.** Requiere un mínimo de tokens por modelo (Haiku 4.5:
4.096) y nuestros contextos rondan los 1.200 en total, así que la API responde sin cachear
y sin avisar. Medido en producción: 0 tokens de caché en 18 generaciones. Ver
`scripts/medir-costo-ia.ts`, que informa el costo real por botón.

### Cómo construir un botón nuevo (lo que hace capitán encima)

1. Importá `IaModule` en tu módulo y inyectá `ServicioIa`.
2. Definí el esquema JSON de tu salida y llamá a `generar(...)`:

```ts
const { salida, generacionId, tokens } = await this.servicioIa.generar<{ ideas: string[] }>({
  organizacionId,                 // del contexto (OrgActual)
  clienteId,                      // opcional, para trazabilidad
  tipoBoton: TipoBotonIa.IDEAS_CONTENIDO,
  contextoMarca: textoEstrategiaDeLaMarca,   // estable y grande → se cachea
  instruccion: 'Generá 5 ideas de reels para esta semana.',
  esquemaSalida: {
    type: 'object',
    properties: { ideas: { type: 'array', items: { type: 'string' } } },
    required: ['ideas'],
  },
});
// `salida` ya viene parseada según tu esquema.
```

**Reglas del contrato** (ver `src/ia/tipos.ts`): `esquemaSalida` debe ser un objeto JSON Schema
(`type: "object"` + `properties` + `required`). Poné lo estable (marca/estrategia) en
`contextoMarca` y la instrucción puntual en `instruccion`. Si falta la API key, `generar`
lanza `503`. Para alto volumen, evaluar `claude-sonnet-4-6` por tipo de tarea vía `MODELO_IA`.
