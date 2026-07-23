import { PlanSuscripcion } from '@prisma/client';

/**
 * Plan que realmente rige hoy para una organización.
 *
 * Una prueba gratuita vencida **no bloquea la cuenta**: la hace caer a STARTER.
 * Como el vencimiento es una fecha y no un evento, se calcula al leerlo — así no
 * hace falta ningún job que "baje" planes, y no existe la ventana en la que la
 * prueba ya venció pero nadie la degradó todavía.
 */
export function planEfectivo(organizacion: {
  plan: PlanSuscripcion;
  planExpiraEn: Date | null;
}): PlanSuscripcion {
  const { plan, planExpiraEn } = organizacion;
  if (plan !== PlanSuscripcion.PRUEBA) return plan;
  if (planExpiraEn && planExpiraEn.getTime() <= Date.now()) return PlanSuscripcion.STARTER;
  return PlanSuscripcion.PRUEBA;
}
