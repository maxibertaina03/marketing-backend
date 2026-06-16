import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ContextoPeticion, PeticionConContexto } from '../tipos/contexto-peticion';

/**
 * Inyecta el ContextoPeticion completo (usuario, membresia, organizacionId, rol)
 * en el parámetro de un handler. Ej.: metodo(@ContextoActual() ctx: ContextoPeticion)
 */
export const ContextoActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): ContextoPeticion | undefined => {
    const peticion = ctx.switchToHttp().getRequest<PeticionConContexto>();
    return peticion.contexto;
  },
);

/**
 * Inyecta directamente el organizacionId del usuario autenticado.
 * Ej.: listar(@OrgActual() organizacionId: string)
 */
export const OrgActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): string | undefined => {
    const peticion = ctx.switchToHttp().getRequest<PeticionConContexto>();
    return peticion.contexto?.organizacionId;
  },
);

/**
 * Inyecta directamente el usuario autenticado (disponible aunque todavía no
 * pertenezca a ninguna organización).
 * Ej.: perfil(@UsuarioActual() usuario)
 */
export const UsuarioActual = createParamDecorator((_dato: unknown, ctx: ExecutionContext) => {
  const peticion = ctx.switchToHttp().getRequest<PeticionConContexto>();
  return peticion.usuario;
});
