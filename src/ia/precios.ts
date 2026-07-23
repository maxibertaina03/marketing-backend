/**
 * Precios de los modelos, en USD por millón de tokens.
 * Fuente: https://platform.claude.com/docs/en/about-claude/pricing (22/07/2026).
 *
 * Es la única lista: la usan el acumulador de consumo y `scripts/medir-costo-ia.ts`.
 * Si Anthropic cambia precios, se toca acá y todo lo demás se recalcula.
 */
export interface PrecioModelo {
  entrada: number;
  salida: number;
  cacheEscritura: number;
  cacheLectura: number;
}

export const PRECIOS: Record<string, PrecioModelo> = {
  'claude-opus-4-8': { entrada: 5, salida: 25, cacheEscritura: 6.25, cacheLectura: 0.5 },
  'claude-sonnet-5': { entrada: 2, salida: 10, cacheEscritura: 2.5, cacheLectura: 0.2 },
  'claude-haiku-4-5': { entrada: 1, salida: 5, cacheEscritura: 1.25, cacheLectura: 0.1 },
  // Mismo modelo con la versión fijada: se factura igual.
  'claude-haiku-4-5-20251001': { entrada: 1, salida: 5, cacheEscritura: 1.25, cacheLectura: 0.1 },
};

/** Modelos distintos que se comparan en los informes (sin repetir alias). */
export const MODELOS_COMPARABLES = ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'];

export interface TokensUsados {
  entrada: number;
  salida: number;
  cacheEscritura: number;
  cacheLectura: number;
}

const MILLON = 1_000_000;

/**
 * Costo en USD de una llamada. Si el modelo no está en la lista devuelve 0: es
 * preferible informar de menos y que se note el precio faltante, a inventar un
 * número que después se use para fijar cuotas.
 */
export function costoUsd(tokens: TokensUsados, modelo: string): number {
  const precio = PRECIOS[modelo];
  if (!precio) return 0;
  return (
    (tokens.entrada * precio.entrada +
      tokens.salida * precio.salida +
      tokens.cacheEscritura * precio.cacheEscritura +
      tokens.cacheLectura * precio.cacheLectura) /
    MILLON
  );
}
