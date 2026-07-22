# Fase 6 — Notificaciones, control de IA y planes comerciales

> **Objetivo:** convertir el producto en un negocio. Hoy ContentOS funciona pero no se puede cobrar:
> no hay planes, ni límites, ni forma de controlar el gasto de IA. Esta fase resuelve eso, y suma el
> centro de notificaciones para que el CM no tenga que acordarse de todo.
>
> Decisiones de producto ya tomadas (ver el final). El reparto sigue la regla de siempre: cada uno
> dueño de sus módulos, de punta a punta.

---

## Bloque A — Centro de notificaciones

Un aviso a tiempo es lo que hace que el CM entre a la app todos los días.

### Los dos tipos de aviso (cambian el diseño)

**Por evento** — se crean en el momento en que pasa algo:
- 🔔 *"El cliente aprobó una publicación."*
- 🔔 *"Te rechazaron una publicación: revisá el motivo."*
- 🔔 *"Te asignaron una tarea."*

**Por revisión periódica** — las genera un job diario que evalúa reglas:
- 🔔 *"Tenés 3 publicaciones pendientes de aprobación."*
- 🔔 *"Hace 5 días que no publicás para Villcor."*
- 🔔 *"La campaña de Villcor termina mañana."*
- 🔔 *"El Instagram de Villcor se desconectó."*

### Cómo se construye
- **Modelo `Notificacion`**: organización, destinatario, tipo, título, cuerpo, enlace, leída, fecha.
  Se agrupa por regla para no repetir el mismo aviso todos los días.
- **API**: listar (no leídas primero), marcar una como leída, marcar todas.
- **UI**: campanita en la barra superior con contador, panel desplegable, y cada aviso lleva al lugar
  correspondiente. Se marca leída al hacer clic.
- **Motor de reglas**: cada regla es una función que devuelve los avisos a crear. El job diario
  (el programador ya está andando) las recorre.

### Reparto
- **masita** — infraestructura: modelo, API, campanita, panel, marcar leídas y el motor de reglas.
  Más sus reglas: tarea asignada, Instagram desconectado.
- **capitán** — las reglas de sus dominios: pendientes de aprobación, cliente aprobó o rechazó,
  días sin publicar, campaña por terminar.

---

## Bloque B — Consumo y límites de IA

Hoy **cualquier cliente puede gastar la API de Anthropic sin techo**. Es el riesgo económico más
concreto del negocio.

### Medir antes de limitar
Ya guardamos en `GeneracionIa` los tokens de entrada y salida de **cada** generación. O sea:
**podemos calcular el costo real por generación con datos propios, antes de fijar las cuotas.**
Ese es el primer paso de la fase — fijar precios sin ese número es adivinar.

### Cómo se controla
- **Modelo `ConsumoIa`** por organización y período (`YYYY-MM`): tokens de entrada, de salida y
  cantidad de generaciones. Se actualiza en cada llamada, así consultarlo es inmediato.
- **Cuota mensual por organización**, definida por su plan.
- **Sub-límite opcional por usuario**, para que un solo CM no se coma la cuota de la agencia.
- **Dónde se aplica**: en `ServicioIa.generar()`, que es **el único punto por el que pasan todos los
  botones de IA**. Se valida antes de llamar a Anthropic.
- **Al agotarse la cuota se bloquea**, con un mensaje claro de cuánto se consumió y un botón para
  mejorar el plan. No se deja pasar "por esta vez": es lo que protege el margen.
- **Aviso al 80%** de la cuota, usando el centro de notificaciones del bloque A.
- **Panel de consumo** en Configuración: cuánto va, cuánto queda, y el detalle por usuario y por marca.

### Reparto
- **masita** — todo el bloque (dueño del módulo `ia` y de Configuración).

---

## Bloque C — Portal de superadministración

Un lugar donde **solo capitán y masita** vean todas las agencias y administren sus límites.
Va **dentro de la misma app**, en una ruta oculta.

### ⚠️ Es el cambio más delicado de la fase
Hoy **todo** el sistema filtra por organización: nadie puede ver datos de otra agencia. Este portal
rompe esa regla a propósito, así que va aislado:

- Marca `esSuperadmin` en el usuario — **no es un rol de organización**: está por encima de ellas.
- **Guard propio** (`GuardSuperadmin`), separado del de roles, para que no se pueda llegar por
  accidente desde el flujo normal.
- **Módulo `admin` aparte**, que no se mezcla con los endpoints de negocio.
- Ruta `/admin` fuera del menú común, visible solo si sos superadmin.
- **Registro de auditoría**: qué superadmin cambió qué y cuándo.

### Qué permite hacer
- Listar todas las agencias: plan, marcas, usuarios, consumo de IA del mes y última actividad.
- Cambiar el plan de una agencia y ajustar sus límites a mano (Enterprise o excepciones).
- Recargar o reiniciar la cuota de IA de una agencia.
- Suspender o reactivar una agencia (por falta de pago).
- Ver el consumo total de la plataforma.

### Reparto
- **masita** — todo el bloque (seguridad e infraestructura).

---

## Bloque D — Planes y límites comerciales

### La grilla

| | 🟢 Starter | 🔵 Agency | 🟣 Agency Pro | 🏢 Enterprise |
|---|---|---|---|---|
| **Precio** | US$29/mes | **US$79/mes** | US$149/mes | a medida |
| **Para quién** | Freelancers y CM | Agencias chicas | Agencias con muchos clientes | Agencias grandes |
| Marcas | 3 | 10 | 30 | ilimitadas |
| **Usuarios internos** | 1 | 5 | 15 | a medida |
| **Usuarios "Cliente"** | **ilimitados** | **ilimitados** | **ilimitados** | **ilimitados** |
| Calendario y clientes | ✓ | ✓ | ✓ | ✓ |
| IA de Contenido | ✓ | ✓ | ✓ | ✓ |
| Banco de ideas y Biblioteca | ✓ | ✓ | ✓ | ✓ |
| Portal de aprobación | ✓ | ✓ | ✓ | ✓ |
| Métricas de Instagram | ✓ | ✓ | ✓ | ✓ |
| **IA Estratégica y Campañas** | — | ✓ | ✓ | ✓ |
| **Roles y permisos** | — | ✓ | ✓ | ✓ |
| **Producción y tareas** | — | ✓ | ✓ | ✓ |
| **Informes mensuales** | — | ✓ | ✓ | ✓ |
| **Automatizaciones** | — | ✓ | ✓ | ✓ |
| Cuota de IA | baja | media | alta | a medida |
| Soporte | — | — | prioritario | prioritario + implementación |

**Los usuarios del rol Cliente no consumen cupo.** Si contaran, el freelancer de Starter gastaría su
único lugar en un cliente y se quedaría sin poder usar su propia cuenta. Además es argumento de
venta: *"invitá a todos tus clientes sin costo adicional"*.

**Prueba gratuita: 14 días con el plan Agency completo, sin tarjeta.** Técnicamente es un plan más,
con fecha de vencimiento; al terminar, la agencia pasa a Starter salvo que contrate.

**Descuento anual:** dos meses gratis pagando el año (US$790 en vez de US$948 en Agency). Mejora el
flujo de caja y baja la tasa de bajas.

**Las cuotas de IA en números se definen después de medir el costo real** (bloque B). Se expresan en
**generaciones por mes** —que el cliente entiende— y se miden en tokens por dentro.

### Cómo se aplica técnicamente
- **`Organizacion.plan`** + sus límites, editables a mano desde el portal superadmin (Enterprise).
- **Tres puntos de control**: al crear una marca, al invitar un usuario interno y al generar con IA.
- **Funcionalidades por plan**: las secciones no incluidas no aparecen en el menú y muestran una
  invitación a mejorar el plan (reusa la infraestructura del menú por rol que ya existe).
- **Página de planes** dentro de la app, con el plan actual y el consumo.

### Reparto
- **masita** — modelo de planes, los tres controles, gating por plan en el menú y página de planes.
- **capitán** — el aviso de "esta función es de otro plan" en sus pantallas (IA Estratégica,
  Campañas, Informes, Producción).

---

## Bloque E — Evitar agencias duplicadas (onboarding de entrada)

**Problema detectado en producción:** una usuaria terminó con **dos agencias**, una de ellas vacía,
porque al registrarse la app solo ofrece *crear* una agencia — no existe la opción de *unirse* a una
existente. Sumado a que las invitaciones no envían email, los equipos se fragmentan: en vez de que
una invite a la otra, cada una crea la suya.

**Por qué importa para cobrar:** los planes se facturan **por agencia**. Un equipo que sin querer
crea dos tiene el trabajo partido, o recibe dos suscripciones, o se va pensando que perdió sus datos.

### Qué se hace
1. **Al registrarse, si el email tiene una invitación pendiente, la persona entra directo a esa
   agencia** en lugar de que se le ofrezca crear una. Resuelve la mitad del problema con poco código
   (la lógica de aplicar invitaciones ya existe en `GuardAutenticacion`).
2. **Pantalla de bienvenida** cuando no hay invitación: explica la diferencia entre *crear mi
   agencia* y *esperar una invitación*, en vez de empujar al formulario de creación.
3. **Aviso al crear una segunda agencia**: "ya pertenecés a X. ¿Seguro que querés crear otra
   agencia separada?" — con la aclaración de que los datos no se comparten.
4. **Poder abandonar o eliminar** una agencia vacía desde la propia app (hoy hay que tocar la base).

### Reparto
- **masita** — todo el bloque (dueño de `organizaciones` y `equipo`).

---

## Estrategia comercial

### El posicionamiento

> **No vendemos la IA. Vendemos que la IA conoce cada marca.**

Es el diferencial más fuerte y es cierto: la IA usa la estrategia, el público, el tono y los pilares
de cada marca como contexto, y no es un chat sino herramientas concretas (Oportunidades de
Crecimiento, FODA, Buyer Persona, Pilares, copys, hooks, carruseles, campañas).

> *"No le pidas a una IA un post genérico. ContentOS conoce tu marca, tu público, tus objetivos y tu
> estrategia."*

Encabezado de la página de ventas:

> **ContentOS — El sistema operativo de tu agencia de marketing.**
> Gestioná todas tus marcas, planificá contenido, generá estrategias con IA, organizá a tu equipo,
> conseguí aprobaciones y analizá métricas de Instagram desde un solo lugar.

**Agency (US$79) es el plan ancla.** El salto Starter → Agency es claro y valioso (equipo, roles,
informes, automatizaciones): es lo que empuja a subir cuando la agencia crece.

---

## Orden sugerido

**Sprint 1 — Ver antes de limitar**
1. Medición del costo real por generación — *masita*
2. Modelo de consumo de IA + panel en Configuración — *masita*
3. Infraestructura de notificaciones + campanita — *masita*
4. Reglas de notificación de sus dominios — *capitán*
5. Evitar agencias duplicadas: unirse por invitación al registrarse — *masita*

**Sprint 2 — Controlar**
6. Modelo de planes + los tres controles — *masita*
7. Gating por plan en el menú y en pantallas — *masita + capitán*
8. Portal de superadministración — *masita*

**Sprint 3 — Vender**
8. Página de planes y prueba gratuita — *masita*
9. Página de ventas pública con la grilla — *conjunto*
10. Pasarela de pago: Mercado Pago / Stripe — *masita*

> El cobro va último a propósito: **sin límites aplicados, vender planes distintos no significa nada.**

---

## Decisiones tomadas

1. **Los usuarios del rol Cliente no cuentan** en el límite del plan.
2. **Al agotarse la cuota de IA se bloquea**, con mensaje claro y botón para mejorar el plan.
3. **Hay prueba gratuita**: 14 días con Agency completo, sin tarjeta.
4. **Las cuotas en números se definen después** de medir el costo real por generación.
5. **El portal de superadmin va en la misma app**, en ruta oculta y con guard propio aislado.
