import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { AprobacionesService } from './aprobaciones.service';
import { FiltrarAprobacionesDto } from './dto/filtrar-aprobaciones.dto';
import { AprobarDto } from './dto/aprobar.dto';
import { RechazarDto } from './dto/rechazar.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { ContextoActual } from '../comun/decoradores/contexto-actual.decorator';
import type { ContextoPeticion } from '../comun/tipos/contexto-peticion';

@ApiTags('aprobaciones')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('aprobaciones')
export class AprobacionesController {
  constructor(private readonly aprobaciones: AprobacionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Lista publicaciones EN_REVISION para el equipo.' })
  listar(
    @OrgActual() organizacionId: string,
    @Query() filtros: FiltrarAprobacionesDto,
  ) {
    return this.aprobaciones.listar(organizacionId, filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.CLIENTE)
  @ApiOperation({ summary: 'Detalle de una publicación para revisión.' })
  obtener(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @ContextoActual() ctx: ContextoPeticion,
  ) {
    return this.aprobaciones.obtener(organizacionId, id, {
      organizacionId,
      membresiaId: ctx.membresia.id,
      rol: ctx.rol,
      clienteId: ctx.membresia.clienteId,
    });
  }

  @Post(':id/enviar-revision')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(200)
  @ApiOperation({ summary: 'Envía una publicación a revisión (BORRADOR/RECHAZADO → EN_REVISION).' })
  enviarRevision(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.aprobaciones.enviarRevision(organizacionId, id);
  }

  @Post(':id/aprobar')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.CLIENTE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprueba una publicación EN_REVISION.' })
  aprobar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: AprobarDto,
    @ContextoActual() ctx: ContextoPeticion,
  ) {
    return this.aprobaciones.aprobar(organizacionId, id, dto, {
      organizacionId,
      membresiaId: ctx.membresia.id,
      rol: ctx.rol,
      clienteId: ctx.membresia.clienteId,
    });
  }

  @Post(':id/rechazar')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.CLIENTE)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechaza una publicación EN_REVISION con motivo obligatorio.' })
  rechazar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: RechazarDto,
    @ContextoActual() ctx: ContextoPeticion,
  ) {
    return this.aprobaciones.rechazar(organizacionId, id, dto, {
      organizacionId,
      membresiaId: ctx.membresia.id,
      rol: ctx.rol,
      clienteId: ctx.membresia.clienteId,
    });
  }
}
