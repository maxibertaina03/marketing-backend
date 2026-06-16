import type { Request } from 'express';
import type { Rol, Usuario, Membresia } from '@prisma/client';

/**
 * Contexto de organización de una petición. Está presente cuando el usuario
 * autenticado pertenece a una organización (y se pudo resolver cuál).
 */
export interface ContextoPeticion {
  usuario: Usuario;
  membresia: Membresia;
  organizacionId: string;
  rol: Rol;
}

/**
 * Request de Express extendido por el GuardAutenticacion:
 * - `usuario`: siempre presente tras autenticar (JWT válido + usuario en BD).
 * - `contexto`: presente solo cuando se resolvió la organización del usuario.
 */
export interface PeticionConContexto extends Request {
  usuario?: Usuario;
  contexto?: ContextoPeticion;
}
