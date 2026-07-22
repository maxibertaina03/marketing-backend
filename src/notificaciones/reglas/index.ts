import { ReglaNotificacion } from '../tipos';
import { reglaInstagramDesconectado } from './instagram-desconectado.regla';

/**
 * Reglas que evalúa el job diario, en orden.
 *
 * Para sumar una: creá `<nombre>.regla.ts` en esta carpeta exportando un
 * `ReglaNotificacion` y agregalo acá. No hace falta tocar nada más — ni módulos,
 * ni providers, ni el controller.
 *
 * Reglas pendientes (Fase 6):
 *  - `aprobaciones-pendientes`  — capitán
 *  - `dias-sin-publicar`        — capitán
 *  - `campana-por-terminar`     — capitán
 */
export const REGLAS: ReglaNotificacion[] = [reglaInstagramDesconectado];
