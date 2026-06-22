import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Canal, EstadoContenido, Rol } from '@prisma/client';
import { ContenidoService } from './contenido.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ActualizarPublicacionDto } from './dto/actualizar-publicacion.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { Roles } from '../comun/decoradores/roles.decorator';

@ApiTags('contenido')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('contenido')
export class ContenidoController {
  constructor(private readonly contenido: ContenidoService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Crea una nueva publicación asociada a una estrategia de marca.' })
  crear(@OrgActual() organizacionId: string, @Body() dto: CrearPublicacionDto) {
    return this.contenido.crear(organizacionId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista publicaciones con filtros opcionales. Usá desde/hasta para el calendario.',
  })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'estrategiaId', required: false })
  @ApiQuery({ name: 'canal', required: false, enum: Canal })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoContenido })
  @ApiQuery({
    name: 'desde',
    required: false,
    description: 'ISO 8601 — inicio del rango de fechaProgramada.',
  })
  @ApiQuery({
    name: 'hasta',
    required: false,
    description: 'ISO 8601 — fin del rango de fechaProgramada.',
  })
  listar(
    @OrgActual() organizacionId: string,
    @Query('clienteId') clienteId?: string,
    @Query('estrategiaId') estrategiaId?: string,
    @Query('canal') canal?: Canal,
    @Query('estado') estado?: EstadoContenido,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.contenido.listar(organizacionId, {
      clienteId,
      estrategiaId,
      canal,
      estado,
      desde,
      hasta,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve una publicación por ID.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.contenido.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Actualiza el contenido o metadatos de una publicación.' })
  actualizar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarPublicacionDto,
  ) {
    return this.contenido.actualizar(organizacionId, id, dto);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Cambia el estado de una publicación (flujo de aprobación).' })
  cambiarEstado(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.contenido.cambiarEstado(organizacionId, id, dto.estado);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una publicación.' })
  eliminar(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.contenido.eliminar(organizacionId, id);
  }
}
