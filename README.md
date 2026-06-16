# marketing-backend — ContentOS API

Backend de **ContentOS**, la plataforma de gestión para agencias de marketing.
Stack: **NestJS + TypeScript + Prisma + PostgreSQL**, autenticación con **Clerk**, IA con **Claude (Anthropic)**.

> Convención del proyecto: **todo el código va nombrado en español** (carpetas, módulos, clases, variables, campos de BD). Ver el plan en `../.claude/plans/`.

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL) — o un Postgres propio
- Una cuenta de [Clerk](https://clerk.com) (gratis) para autenticación

## Puesta en marcha (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
#    Completá CLERK_JWKS_URL y CLERK_ISSUER con los datos de tu app en Clerk.

# 3. Levantar PostgreSQL con Docker
npm run db:up

# 4. Generar el cliente de Prisma y aplicar el schema
npm run prisma:generate
npm run prisma:migrate      # crea la primera migración

# 5. Arrancar en modo desarrollo
npm run dev
```

- API: `http://localhost:3000/api`
- Documentación Swagger (contrato con el frontend): `http://localhost:3000/api/docs`
- Healthcheck público: `GET http://localhost:3000/api/salud`

## Estructura

```
src/
  comun/           Guards (autenticación Clerk, roles) y decoradores (@Roles, @OrgActual, @UsuarioActual)
  prisma/          PrismaService (acceso a la base de datos)
  salud/           Healthcheck público
  organizaciones/  Crear organización, listar las propias, ver la activa
  membresias/      Listar miembros de la organización activa
prisma/schema.prisma   Modelo de datos (Organizacion, Usuario, Membresia)
docker-compose.yml     PostgreSQL para desarrollo
```

## Autenticación y multi-tenancy

- El frontend manda el JWT de Clerk en `Authorization: Bearer <token>`.
- `GuardAutenticacion` lo valida contra las JWKS de Clerk, provisiona el `Usuario`
  (campo `clerkId`) y resuelve la organización activa.
- Para operar dentro de una organización el cliente manda el header
  `x-organizacion-id`. Las rutas multi-tenant usan `@UseGuards(GuardRoles)`.
- Roles: `ADMIN`, `COMMUNITY_MANAGER`, `DISENADOR`, `COPYWRITER`, `ANALISTA`, `CLIENTE`.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Arranca en watch mode |
| `npm run build` | Compila a `dist/` |
| `npm run lint` | ESLint + Prettier |
| `npm test` | Tests unitarios (Jest) |
| `npm run db:up` / `db:down` | Levanta / baja PostgreSQL (Docker) |
| `npm run prisma:migrate` | Crea/aplica migraciones |
| `npm run prisma:studio` | Explorador visual de la BD |

## Flujo de ramas

`main` (producción) ← `develop` (integración) ← `masita/*` y `capitan/*` (trabajo).
PRs hacia `develop`, revisados por el otro integrante. Ver el plan del proyecto.
