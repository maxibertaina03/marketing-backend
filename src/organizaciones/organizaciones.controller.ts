import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Usuario } from '@prisma/client';
import { OrganizacionesService } from './organizaciones.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual, UsuarioActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('organizaciones')
@ApiBearerAuth()
@Controller('organizaciones')
export class OrganizacionesController {
  constructor(private readonly organizaciones: OrganizacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una organización; el usuario actual queda como ADMIN.' })
  crear(@UsuarioActual() usuario: Usuario, @Body() dto: CrearOrganizacionDto) {
    return this.organizaciones.crear(usuario.id, dto);
  }

  @Get('mias')
  @ApiOperation({ summary: 'Lista las organizaciones del usuario actual con su rol.' })
  listarMias(@UsuarioActual() usuario: Usuario) {
    return this.organizaciones.listarMias(usuario.id);
  }

  @Get('actual')
  @UseGuards(GuardRoles)
  @ApiOperation({ summary: 'Devuelve la organización activa (según x-organizacion-id).' })
  obtenerActual(@OrgActual() organizacionId: string) {
    return this.organizaciones.obtener(organizacionId);
  }
}
