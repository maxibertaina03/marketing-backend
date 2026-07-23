import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { PeticionConContexto } from '../comun/tipos/contexto-peticion';
import { SuperadminService } from './superadmin.service';

/**
 * Guard del portal de superadministración. Es **independiente** del guard de roles:
 * la condición no es un rol de organización, sino estar en la lista `SUPERADMINS`.
 * Así nadie puede volverse superadmin desde la app —no hay endpoint que lo otorgue—
 * y el portal queda fuera del RBAC normal a propósito.
 *
 * Corre después del GuardAutenticacion, así que `request.usuario` ya está resuelto.
 */
@Injectable()
export class GuardSuperadmin implements CanActivate {
  constructor(private readonly superadmin: SuperadminService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto.switchToHttp().getRequest<PeticionConContexto>();
    if (!this.superadmin.esSuperadmin(peticion.usuario?.email)) {
      // Mismo mensaje que daría una ruta inexistente: no se confirma que el
      // portal existe a quien no es superadmin.
      throw new ForbiddenException('Acceso denegado.');
    }
    return true;
  }
}
