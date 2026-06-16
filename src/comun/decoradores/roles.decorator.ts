import { SetMetadata } from '@nestjs/common';
import type { Rol } from '@prisma/client';

/** Clave de metadato donde se guardan los roles permitidos de una ruta. */
export const CLAVE_ROLES = 'rolesPermitidos';

/**
 * Restringe una ruta a los roles indicados. Se usa junto con GuardRoles.
 * Ej.: @Roles('ADMIN', 'COMMUNITY_MANAGER')
 */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);
