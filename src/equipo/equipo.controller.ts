import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { EquipoService } from './equipo.service';
import { InvitarMiembroDto } from './dto/invitar-miembro.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Equipo de la organización activa. Leer miembros: cualquier miembro.
 * Invitar / cambiar rol / quitar: solo ADMIN.
 */
@ApiTags('equipo')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('equipo')
export class EquipoController {
  constructor(private readonly equipo: EquipoService) {}

  @Get('miembros')
  @ApiOperation({ summary: 'Lista los miembros de la organización activa.' })
  listarMiembros(@OrgActual() organizacionId: string) {
    return this.equipo.listarMiembros(organizacionId);
  }

  @Get('invitaciones')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Lista las invitaciones pendientes.' })
  listarInvitaciones(@OrgActual() organizacionId: string) {
    return this.equipo.listarInvitaciones(organizacionId);
  }

  @Post('invitaciones')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Invita a alguien por email con un rol.' })
  invitar(@OrgActual() organizacionId: string, @Body() dto: InvitarMiembroDto) {
    return this.equipo.invitar(organizacionId, dto);
  }

  @Delete('invitaciones/:id')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Cancela una invitación pendiente.' })
  cancelarInvitacion(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.equipo.cancelarInvitacion(organizacionId, id);
  }

  @Patch('miembros/:membresiaId')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Cambia el rol de un miembro.' })
  cambiarRol(
    @OrgActual() organizacionId: string,
    @Param('membresiaId') membresiaId: string,
    @Body() dto: CambiarRolDto,
  ) {
    return this.equipo.cambiarRol(organizacionId, membresiaId, dto.rol);
  }

  @Delete('miembros/:membresiaId')
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Quita a un miembro de la organización.' })
  quitarMiembro(@OrgActual() organizacionId: string, @Param('membresiaId') membresiaId: string) {
    return this.equipo.quitarMiembro(organizacionId, membresiaId);
  }
}
