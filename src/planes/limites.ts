import { PlanSuscripcion } from '@prisma/client';

/** `null` = sin límite. */
export interface LimitesPlan {
  marcas: number | null;
  /** No cuenta a los usuarios con rol CLIENTE: esos son ilimitados en todos los planes. */
  usuariosInternos: number | null;
  generacionesIaPorMes: number | null;
}

/**
 * Límites de cada plan.
 *
 * Las cuotas de IA se fijaron después de medir el costo real (22/07/2026:
 * US$0.00575 por generación). Están puestas **holgadas a propósito**: al costo
 * actual, agotar la de Agency sale menos del 6% del precio del plan. Sirven para
 * diferenciar planes y frenar un abuso, no para cuidar el margen —el margen no
 * está en riesgo—. Se revisan cuando haya uso real de clientes que pagan.
 */
export const LIMITES: Record<PlanSuscripcion, LimitesPlan> = {
  // La prueba es Agency completo.
  PRUEBA: { marcas: 10, usuariosInternos: 5, generacionesIaPorMes: 750 },
  STARTER: { marcas: 3, usuariosInternos: 1, generacionesIaPorMes: 150 },
  AGENCY: { marcas: 10, usuariosInternos: 5, generacionesIaPorMes: 750 },
  AGENCY_PRO: { marcas: 30, usuariosInternos: 15, generacionesIaPorMes: 2500 },
  ENTERPRISE: { marcas: null, usuariosInternos: null, generacionesIaPorMes: null },
};

/** Umbral en el que se avisa que la cuota se está por agotar. */
export const AVISO_CUOTA = 0.8;

/**
 * Límites que rigen para una organización: los de su plan, salvo que tenga
 * override propio (Enterprise o excepciones puestas desde el portal superadmin).
 */
export function limitesDe(organizacion: {
  plan: PlanSuscripcion;
  limiteMarcas: number | null;
  limiteUsuariosInternos: number | null;
  limiteGeneracionesIa: number | null;
}): LimitesPlan {
  const base = LIMITES[organizacion.plan];
  return {
    marcas: organizacion.limiteMarcas ?? base.marcas,
    usuariosInternos: organizacion.limiteUsuariosInternos ?? base.usuariosInternos,
    generacionesIaPorMes: organizacion.limiteGeneracionesIa ?? base.generacionesIaPorMes,
  };
}

/** Período de facturación de hoy, en formato `YYYY-MM` (UTC). */
export function periodoActual(fecha = new Date()): string {
  return fecha.toISOString().slice(0, 7);
}
