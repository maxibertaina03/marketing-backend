import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { ArchivosService } from './archivos.service';
import { CrearArchivoDto } from './dto/crear-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { FiltrarArchivosDto } from './dto/filtrar-archivos.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Gestión de Archivos de las marcas. Registrar/editar/eliminar: ADMIN,
 * COMMUNITY_MANAGER o DISENADOR. Leer: cualquier miembro.
 */
@ApiTags('archivos')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivos: ArchivosService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.DISENADOR)
  @ApiOperation({ summary: 'Registra un archivo (metadata + URL) de una marca.' })
  crear(@OrgActual() organizacionId: string, @Body() dto: CrearArchivoDto) {
    return this.archivos.crear(organizacionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista archivos (filtros: clienteId, publicacionId, tipo).' })
  listar(@OrgActual() organizacionId: string, @Query() filtros: FiltrarArchivosDto) {
    return this.archivos.listar(organizacionId, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve un archivo por id.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.archivos.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.DISENADOR)
  @ApiOperation({ summary: 'Actualiza la metadata de un archivo.' })
  actualizar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarArchivoDto,
  ) {
    return this.archivos.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.DISENADOR)
  @ApiOperation({ summary: 'Elimina (desregistra) un archivo.' })
  eliminar(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.archivos.eliminar(organizacionId, id);
  }
}
