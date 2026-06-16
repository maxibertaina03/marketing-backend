import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '@prisma/client';
import { CLAVE_ROLES } from '../decoradores/roles.decorator';
import type { PeticionConContexto } from '../tipos/contexto-peticion';

/**
 * Guard de autorización por roles. Corre después del GuardAutenticacion.
 *
 * - Exige que exista contexto de organización (si no, el usuario no eligió/no tiene org → 403).
 * - Si la ruta declara @Roles(...), verifica que el rol del usuario esté permitido.
 * - Si la ruta no declara roles, basta con tener contexto de organización válido.
 */
@Injectable()
export class GuardRoles implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    const peticion = contexto.switchToHttp().getRequest<PeticionConContexto>();
    if (!peticion.contexto) {
      throw new ForbiddenException(
        'Se requiere una organización activa. Indicá el header x-organizacion-id.',
      );
    }

    if (rolesPermitidos && rolesPermitidos.length > 0) {
      if (!rolesPermitidos.includes(peticion.contexto.rol)) {
        throw new ForbiddenException('No tenés permisos para realizar esta acción.');
      }
    }

    return true;
  }
}
