import { PlanSuscripcion } from '@prisma/client';

/**
 * Precio mensual de cada plan, para cobrar por Mercado Pago.
 *
 * La moneda se configura con `MONEDA_PAGO` (por defecto ARS, que es lo que cobra
 * MP Argentina). Los montos de acá deben estar **en esa moneda**: los US$ de la
 * grilla comercial son de referencia; el número que se cobra es este.
 *
 * PRUEBA y ENTERPRISE no se cobran por Checkout: la prueba es gratis y Enterprise
 * se factura a medida.
 */
export const PRECIO_MENSUAL: Partial<Record<PlanSuscripcion, number>> = {
  STARTER: 29,
  AGENCY: 79,
  AGENCY_PRO: 149,
};

/** Planes que se pueden pagar online. */
export function esPlanPagable(plan: PlanSuscripcion): plan is 'STARTER' | 'AGENCY' | 'AGENCY_PRO' {
  return plan in PRECIO_MENSUAL;
}
