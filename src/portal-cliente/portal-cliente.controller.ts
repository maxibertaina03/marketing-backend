import { Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { PortalClienteService } from './portal-cliente.service';
import { FiltrarPortalDto } from './dto/filtrar-portal.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { ContextoActual } from '../comun/decoradores/contexto-actual.decorator';
import type { ContextoPeticion } from '../comun/tipos/contexto-peticion';

@ApiTags('portal-cliente')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Roles(Rol.CLIENTE)
@Controller('portal-cliente')
export class PortalClienteController {
  constructor(private readonly portal: PortalClienteService) {}

  @Get('publicaciones')
  @ApiOperation({ summary: 'Lista las publicaciones de la marca del cliente (excluye borradores).' })
  listar(
    @OrgActual() organizacionId: string,
    @ContextoActual() ctx: ContextoPeticion,
    @Query() filtros: FiltrarPortalDto,
  ) {
    const clienteId = ctx.membresia.clienteId;
    if (!clienteId) throw new ForbiddenException('Tu cuenta no está vinculada a ninguna marca.');
    return this.portal.listarPublicaciones(organizacionId, clienteId, filtros);
  }

  @Get('publicaciones/:id')
  @ApiOperation({ summary: 'Detalle de una publicación para el cliente.' })
  obtener(
    @OrgActual() organizacionId: string,
    @ContextoActual() ctx: ContextoPeticion,
    @Param('id') id: string,
  ) {
    const clienteId = ctx.membresia.clienteId;
    if (!clienteId) throw new ForbiddenException('Tu cuenta no está vinculada a ninguna marca.');
    return this.portal.obtenerPublicacion(organizacionId, clienteId, id);
  }
}
