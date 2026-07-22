# Plan de desarrollo — ContentOS

> Plan compartido del equipo (masita y capitan). Vive en los dos repos
> (`marketing-backend` y `marketing-frontend`). El detalle de convenciones y arquitectura
> de cada repo está en su `CLAUDE.md`.

## Estado actual

- **Fases 0-4 — COMPLETAS y en producción.** Backend en Render (+ Postgres), frontend en Vercel.
  Todo el roadmap original está construido y desplegado: clientes, equipo, estrategia, calendario,
  Centro de IA (contenido/estrategia/campañas), banco de ideas, biblioteca de copys, producción,
  archivos, aprobaciones, portal del cliente, dashboard de métricas, IA de métricas, informes y
  automatizaciones. Menú y rutas filtrados por rol.
- **Integración con Meta — LISTA.** Instagram Login (OAuth): conectar la cuenta de una marca y traer
  **métricas reales** a `MetricaPublicacion`. En modo desarrollo (funciona con cuentas tester);
  falta el App Review de Meta para producción abierta.
- **Fase 5 — Sprints 1, 2 y 3 COMPLETOS y desplegados.** Salidas de IA legibles, aprobaciones en
  tablero, producción aclarada, filtro por cliente, IA de Oportunidades de Crecimiento, permisos
  ver/editar + Configuración, **workspace por marca activa** y **subida real de archivos**
  (Cloudinary).
- **Fase 5 — Sprint 4 (#7 auto-publicación)**: código completo (back + front); el posteo real se
  habilita al aprobar Meta el permiso `instagram_business_content_publish`.
- **Próximo: Fase 6 — Notificaciones, control de IA y planes comerciales.** Detalle completo en
  `docs/fase-6.md`.

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

### Fase 4 — Métricas, Integraciones, Informes y Automatizaciones ✅
- **masita:** Integraciones Meta (OAuth Instagram Login + ingesta de métricas reales) + Dashboard
  por Cliente.
- **capitan:** IA de Métricas + Informes Automáticos + Automatizaciones (jobs).

### Fase 5 — Iteración post-testers
Mejoras surgidas del feedback de testers (Notion, 24/06/2026). Se ataca por **sprints**; cada ítem
es un slice de su dueño (back + front), como siempre. Numeración `#n` = ítem del feedback.

- **masita:**
  - **Producción — claridad + vínculo con el calendario (#3):** hacer protagonista el campo
    `Publicacion` de la tarea, permitir "＋ Nueva tarea" desde la publicación, y aclarar en la UI las
    dos capas (estado editorial de la publicación vs. estado de la tarea). *Acuerda con capitán el
    contrato de `contenido`.*
  - **Archivos — subida real de multimedia (#5):** storage (Cloudinary/R2/S3) + endpoint de subida +
    uploader con preview. `Archivo` guarda la URL resultante. Habilita además el auto-posteo (#7).
  - **Configuración — infra de permisos (#6):** matriz **ver vs. editar** por rol en el back + página
    **"Configuración"** (usuarios/roles, extiende `equipo`). Base ya hecha: menú por rol.
  - **Navegación por cliente — infra (#8):** contexto de **"cliente activo"** (Fase B) + filtro por
    cliente en sus secciones (archivos, producción; biblioteca de copys ya lo tiene).
  - **Auto-publicación calendario → Instagram (#7):** Instagram Content Publishing API + job de
    publicación programada. *Depende de #5 (imagen en URL pública) y del App Review de Meta.*
- **capitan:**
  - **IA "Oportunidades de Crecimiento" (#1):** nuevo botón en `ia-estrategia` que cruza marca +
    público + objetivos + **métricas reales** y devuelve oportunidades accionables (IA consultora).
    Reutiliza `ServicioIa`; evaluar deprecar el FODA por uso.
  - **Salidas de IA legibles (#2):** aplicar el render legible de **Biblioteca de Copys** (componente
    `SalidaContenido`) a **Banco de Ideas** y **Campañas** + desplegar/colapsar.
  - **Aprobaciones como tablero (#4):** kanban por estado (En revisión / Aprobada / Rechazada, +
    opcional Borrador/Programado/Publicado). El back ya expone los estados.
  - **Navegación por cliente (#8):** filtro por cliente en sus secciones (estrategia, campañas, banco).
  - **Permisos ver/editar (#6):** aplicar el gating en sus pantallas.
- **Conjunto (acordar contrato antes de empezar):** #8 Fase B (selector de cliente global / workspace
  por marca) · #6 matriz de roles (qué **ve** y qué **edita** cada rol) · #3 contrato tarea ↔ publicación.

**Orden sugerido (sprints):**
1. ✅ **Quick wins:** #2 (IA legible) · #4 (aprobaciones kanban) · #3 (aclarar producción) ·
   #8-Fase A (filtro por cliente en todas las secciones).
2. ✅ **Valor alto:** #1 (IA Oportunidades) · #6 (roles ver/editar + Configuración).
3. ✅ **Arquitectura:** #8-Fase B (workspace por cliente) · #5 (subida de archivos a Cloudinary).
4. ⏳ **Avanzado:** #7 (auto-posteo) — **bloqueado por el App Review de Meta**.

### Fase 6 — Notificaciones, control de IA y planes comerciales
Convertir el producto en un negocio: hoy funciona pero no se puede cobrar. **Detalle completo,
grilla de precios y decisiones tomadas en `docs/fase-6.md`.**

- **masita:**
  - **Consumo y límites de IA:** medir el costo real por generación (ya guardamos los tokens en
    `GeneracionIa`), modelo `ConsumoIa` por organización y período, cuota mensual aplicada en
    `ServicioIa.generar()` (único punto de paso de todos los botones) y panel de consumo en
    Configuración. Al agotarse **se bloquea** con mensaje claro y botón para mejorar el plan.
  - **Infraestructura de notificaciones:** modelo `Notificacion`, API, campanita con contador,
    panel desplegable y el motor que ejecuta las reglas desde el job diario. Más sus reglas
    (tarea asignada, Instagram desconectado).
  - **Portal de superadministración** (`/admin`, misma app): marca `esSuperadmin` en `Usuario`,
    **guard propio aislado** del de roles, módulo `admin` aparte y auditoría. Permite ver todas las
    agencias, cambiar su plan, ajustar cuotas y suspenderlas.
  - **Planes:** `Organizacion.plan` + límites, y los tres controles (crear marca, invitar usuario
    interno, generar con IA). Gating por plan en el menú y página de planes.
- **capitan:**
  - **Reglas de notificación de sus dominios:** publicaciones pendientes de aprobación, cliente
    aprobó o rechazó, días sin publicar para una marca, campaña por terminar.
  - **Gating por plan en sus pantallas:** aviso de "esta función es de otro plan" en IA Estratégica,
    Campañas, Informes y Producción.
- **Conjunto:** la página de ventas pública con la grilla de precios.

**Orden:** (1) medir consumo + notificaciones · (2) planes, límites y portal superadmin ·
(3) página de planes, prueba gratuita y pasarela de pago. El cobro va último: sin límites
aplicados, vender planes distintos no significa nada.

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
