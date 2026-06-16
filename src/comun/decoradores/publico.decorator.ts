import { SetMetadata } from '@nestjs/common';

/** Clave de metadato que marca una ruta como pública (sin autenticación). */
export const CLAVE_PUBLICO = 'esPublico';

/**
 * Marca un controlador o handler como público: el GuardAutenticacion lo deja pasar
 * sin exigir un JWT válido. Útil para el healthcheck o webhooks.
 */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);
