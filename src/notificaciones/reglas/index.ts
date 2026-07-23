import { ReglaNotificacion } from '../tipos';
import { reglaInstagramDesconectado } from './instagram-desconectado.regla';
import { reglaAprobacionesPendientes } from './aprobaciones-pendientes.regla';
import { reglaDiasSinPublicar } from './dias-sin-publicar.regla';

/**
 * Reglas que evalúa el job diario, en orden.
 *
 * Para sumar una: creá `<nombre>.regla.ts` en esta carpeta exportando un
 * `ReglaNotificacion` y agregalo acá. No hace falta tocar nada más — ni módulos,
 * ni providers, ni el controller.
 *
 * Pendiente: `campana-por-terminar` — necesita un modelo Campana con fechaFin.
 */
export const REGLAS: ReglaNotificacion[] = [
  reglaInstagramDesconectado,
  reglaAprobacionesPendientes,
  reglaDiasSinPublicar,
];
