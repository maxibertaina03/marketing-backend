import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Usuario } from '@prisma/client';
import { SuperadminService } from './superadmin.service';
import { UsuarioActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Endpoint de estado del portal, SIN GuardSuperadmin: cualquier usuario
 * autenticado puede preguntar si él mismo es superadmin (para que el front
 * decida si mostrar la ruta /admin). No expone nada sensible: solo un booleano.
 */
@ApiTags('admin')
@Controller('admin/estado')
export class AdminEstadoController {
  constructor(private readonly superadmin: SuperadminService) {}

  @Get()
  @ApiOperation({ summary: 'Indica si el usuario actual es superadmin.' })
  estado(@UsuarioActual() usuario: Usuario) {
    return { esSuperadmin: this.superadmin.esSuperadmin(usuario?.email) };
  }
}
