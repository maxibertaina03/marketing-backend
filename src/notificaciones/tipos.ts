import { Rol, TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Un aviso que se quiere entregar. Es la **única forma** que hay que aprender:
 * la devuelven las reglas del job diario y también se emite directo en un evento
 * (`ServicioNotificaciones.emitir`).
 *
 * No lleva destinatario concreto: se declara *a quién le importa* (por rol o por
 * membresía) y el servicio resuelve las personas.
 */
export interface AvisoPropuesto {
  tipo: TipoNotificacion;

  /**
   * Identificador estable del asunto del aviso. Es lo que evita que el job repita
   * lo mismo todos los días: si el destinatario ya tiene un aviso **sin leer** con
   * esta clave, se actualiza (título, cuerpo, enlace) en lugar de crear otro.
   *
   * Incluí en la clave aquello que distingue un aviso de otro, y **no** incluyas lo
   * que cambia sin cambiar el asunto (un contador, una fecha):
   *
   *   `aprobaciones-pendientes:${clienteId}`   ✅ una por marca, se refresca sola
   *   `aprobaciones-pendientes:${cantidad}`    ❌ crea uno nuevo cada vez que cambia
   *
   * Si querés que un aviso **sí** vuelva a aparecer por período, metelo en la clave:
   *   `campana-por-terminar:${campanaId}:${fechaFin}`
   */
  clave: string;

  titulo: string;
  cuerpo?: string;

  /** Ruta del front a la que lleva el aviso al hacer clic. Ej.: `/aprobaciones`. */
  enlace?: string;

  /**
   * A qué roles de la organización les interesa. Por defecto, los que gestionan
   * (ADMIN y COMMUNITY_MANAGER). El servicio lo expande a las membresías reales.
   */
  paraRoles?: Rol[];

  /**
   * Destinatarios puntuales, cuando el aviso es de una persona y no de un rol
   * (ej.: "te asignaron una tarea"). Si viene, tiene prioridad sobre `paraRoles`.
   */
  paraMembresiaIds?: string[];
}

/** Lo que recibe una regla para poder decidir. */
export interface ContextoRegla {
  /** La regla se evalúa **de a una organización por vez**: filtrá siempre por acá. */
  organizacionId: string;
  prisma: PrismaService;
  /** Hoy a las 00:00 UTC. Usalo en vez de `new Date()` para que los tests sean estables. */
  hoy: Date;
}

/**
 * Una regla del job diario.
 *
 * Es un objeto plano (no un provider de Nest): recibe todo lo que necesita por
 * contexto, así se testea llamando `evaluar()` con un prisma falso.
 *
 * ```ts
 * export const reglaAprobacionesPendientes: ReglaNotificacion = {
 *   nombre: 'aprobaciones-pendientes',
 *   descripcion: 'Avisa cuántas publicaciones esperan aprobación.',
 *   async evaluar({ organizacionId, prisma }) {
 *     const pendientes = await prisma.publicacion.count({
 *       where: { organizacionId, estado: 'EN_REVISION' },
 *     });
 *     if (pendientes === 0) return [];
 *     return [{
 *       tipo: TipoNotificacion.APROBACIONES_PENDIENTES,
 *       clave: 'aprobaciones-pendientes',
 *       titulo: `Tenés ${pendientes} ${pendientes === 1 ? 'publicación pendiente' : 'publicaciones pendientes'} de aprobación.`,
 *       enlace: '/aprobaciones',
 *     }];
 *   },
 * };
 * ```
 *
 * Devolver `[]` es lo normal: significa "hoy no hay nada que avisar".
 */
export interface ReglaNotificacion {
  /** Identificador corto, en kebab-case. Aparece en el log del job. */
  nombre: string;
  descripcion: string;
  evaluar(contexto: ContextoRegla): Promise<AvisoPropuesto[]>;
}
