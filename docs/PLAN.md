# Plan de desarrollo — ContentOS

> Plan compartido del equipo (masita y capitan). Vive en los dos repos
> (`marketing-backend` y `marketing-frontend`). El detalle de convenciones y arquitectura
> de cada repo está en su `CLAUDE.md`.

## Estado actual

- **Fase 0 — COMPLETA.** Ambos repos arrancan, compilan y autentican con Clerk. El frontend
  consume `/salud`, `/organizaciones/mias` y `/membresias`; multi-tenancy por `organizacionId`.
- **Próximo: Fase 1.** masita → Clientes + Equipo · capitan → Estrategia de Marca + Calendario.

---

## Contexto

**ContentOS** es una plataforma SaaS **multi-tenant** para Community Managers y agencias que
centraliza gestión de clientes, estrategia de marca, calendario de contenido, producción,
campañas, métricas, aprobaciones, portal del cliente y un "Centro de IA" basado en **botones**
(no chat). Landing: https://contentosweb.netlify.app/

Stack: **NestJS + React + PostgreSQL**, en dos repos. Equipo de dos: **masita** y **capitan**,
trabajando con Claude Code.

**Decisiones tomadas:**
- IA: Claude API (Anthropic) — SDK oficial `@anthropic-ai/sdk`.
- Auth: **Clerk** (servicio gestionado).
- MVP Fase 1: núcleo lean — Auth + multi-tenant + Clientes + Estrategia + Calendario (sin IA).
- Deploy: a definir; foco inicial en Docker local.

---

## Arquitectura (resumen)

- **Backend** (`marketing-backend`): NestJS modular (un módulo por dominio) + Prisma + Postgres.
  Multi-tenancy por columna `organizacionId`. Auth con Clerk (`GuardAutenticacion` valida el JWT
  contra las JWKS). RBAC con `GuardRoles` + `@Roles`. DTOs con `class-validator`. Swagger en
  `/api/docs` es el **contrato** con el frontend.
- **Frontend** (`marketing-frontend`): React + Vite + TS, Tailwind + componentes estilo shadcn,
  React Router, TanStack Query, Clerk. `clienteApi` adjunta el token + header `x-organizacion-id`.
- **Módulo de IA** (Fase 2+): módulo `ia` en el back (`ServicioIa`) que envuelve el SDK de Claude.
  Patrón "botón = un endpoint = una llamada estructurada" con salida JSON validable
  (`output_config.format`) y prompt caching del contexto de marca. La API key vive solo en el back.

### Convención de nomenclatura (OBLIGATORIA)

**Todo el código se nombra en español** (carpetas, módulos, clases, entidades, variables,
constantes, funciones, rutas de API y campos de BD). En inglés solo: palabras clave del
lenguaje/framework, paquetes npm de terceros y APIs externas (Clerk, Meta, Anthropic).
`PascalCase` clases/entidades · `camelCase` variables/funciones · `UPPER_SNAKE_CASE` constantes y
enums · `kebab-case` carpetas/archivos.

### Modelo de datos (Fase 1)

`Organizacion` · `Usuario` + `Membresia` (con `Rol`) · `Cliente` (la marca) ·
`EstrategiaDeMarca` (1:1 con Cliente) · `Publicacion` (ítem del calendario, con enum
`EstadoContenido`: IDEA, EN_REDACCION, EN_DISENO, EN_REVISION, APROBADO, PROGRAMADO, PUBLICADO,
PAUSADO, RECHAZADO) · `Etiqueta`.

---

## Flujo de ramas (los dos repos igual)

```
main      ← producción, siempre desplegable. Recibe merges de develop por PR.
develop   ← integración. Ambos mergean acá por PR. Es la rama viva del equipo.
masita    ← rama de trabajo de masita
capitan   ← rama de trabajo de capitan
```

1. Trabajar desde `develop`: `git checkout develop && git pull`, luego en tu rama (`masita`/
   `capitan`, o una sub-rama `masita/<feature>` para PRs más chicos).
2. PR de tu rama → `develop`. **Lo revisa el otro** (mínimo 1 aprobación).
3. `develop` → `main` por PR al cerrar una fase.
4. `main` y `develop` protegidas (no push directo). Nunca commitear `.env` ni `node_modules`.
5. **Antes de cada fase**, acordar el contrato de API (DTOs + rutas en Swagger) para no pisarse.

El reparto está hecho por **slices verticales** (cada uno dueño de su módulo de punta a punta,
back + front), así casi nunca tocan los mismos archivos.

---

## Fases por prioridad

### Fase 0 — Cimientos ✅ (completa)
Ambos repos arrancan, compilan, conectan y autentican. Backend: NestJS + Prisma + Postgres +
Clerk + módulos `organizaciones`/`membresias` + Swagger + healthcheck. Frontend: Vite + React +
Tailwind + Clerk + layout + `clienteApi`. CI (lint + build [+ test]) en ambos.

### Fase 1 — MVP núcleo lean
Que un CM cargue clientes, defina su estrategia y planifique contenido en un calendario.
- **masita (Clientes + Equipo):**
  - Back: módulo `clientes` (CRUD, filtros, multi-tenant) · módulo `equipo` (invitar, asignar rol).
  - Front: listado/ficha de cliente · pantalla de equipo y roles.
- **capitan (Estrategia + Calendario):**
  - Back: módulo `estrategia-marca` (1:1 con `Cliente`) · módulo `contenido` (CRUD de
    `Publicacion`, vistas por mes/semana/cliente/red, transiciones de estado).
  - Front: editor de estrategia de marca · calendario (mensual/semanal, drag-and-drop de estados).
- **Conjunto:** Panel general. Acordar el contrato de `Cliente` y `Publicacion` antes de empezar.

### Fase 2 — Centro de IA (botones)
- **masita:** módulo `ia` base (SDK Claude, esquemas de salida, caching, registro de uso) +
  IA de Contenido + Biblioteca de Copys.
- **capitan:** IA Estratégica + IA de Campañas + Banco de Ideas + Biblioteca de Campañas.
- **Conjunto:** definir el contrato del módulo `ia` antes de construir encima. Base de Conocimiento.

### Fase 3 — Producción, Aprobaciones y Portal del Cliente
- **masita:** Producción + Gestión de Archivos.
- **capitan:** Centro de Aprobaciones + Portal del Cliente (rol `CLIENTE`, permisos restringidos).

### Fase 4 — Métricas, Integraciones, Informes y Automatizaciones
- **masita:** Integraciones Meta (OAuth + ingesta de métricas) + Dashboard por Cliente.
- **capitan:** IA de Métricas + Informes Automáticos + Automatizaciones (jobs).

---

## Verificación por fase

- **End-to-end local:** Postgres con Docker → backend (`npm run dev`, :3000, Swagger en
  `/api/docs`) → frontend (`npm run dev`, :5173). Login con Clerk → crear org → recorrer el slice.
- **Backend:** tests de los CRUD y de los guards multi-tenant (org A no ve datos de org B) y RBAC.
- **Frontend:** smoke manual de cada pantalla contra el back real.
- **IA (Fase 2+):** test que valida que la respuesta cumple el JSON schema; verificar caching vía
  `response.usage.cache_read_input_tokens`.
- **"Hecho" =** feature mergeada a `develop`, revisada por el otro, tests/CRUD en verde y flujo
  recorrible en local.
