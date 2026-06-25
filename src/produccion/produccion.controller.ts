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
import { ProduccionService } from './produccion.service';
import { CrearTareaDto } from './dto/crear-tarea.dto';
import { ActualizarTareaDto } from './dto/actualizar-tarea.dto';
import { FiltrarTareasDto } from './dto/filtrar-tareas.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Producción: tareas del equipo sobre las publicaciones, y el tablero de producción.
 * Crear/eliminar: ADMIN o COMMUNITY_MANAGER. Actualizar (incl. avanzar estado):
 * además DISENADOR y COPYWRITER (los que ejecutan). Leer: cualquier miembro.
 */
@ApiTags('produccion')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('produccion/tareas')
export class ProduccionController {
  constructor(private readonly produccion: ProduccionService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Crea una tarea de producción sobre una publicación.' })
  crear(@OrgActual() organizacionId: string, @Body() dto: CrearTareaDto) {
    return this.produccion.crear(organizacionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista tareas (filtros: publicacionId, asignadoId, estado, tipo).' })
  listar(@OrgActual() organizacionId: string, @Query() filtros: FiltrarTareasDto) {
    return this.produccion.listar(organizacionId, filtros);
  }

  @Get('tablero')
  @ApiOperation({ summary: 'Tablero de producción: tareas agrupadas por estado.' })
  tablero(@OrgActual() organizacionId: string, @Query() filtros: FiltrarTareasDto) {
    return this.produccion.tablero(organizacionId, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve una tarea por id.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.produccion.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.DISENADOR, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Actualiza una tarea (estado, responsable, datos).' })
  actualizar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarTareaDto,
  ) {
    return this.produccion.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Elimina una tarea.' })
  eliminar(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.produccion.eliminar(organizacionId, id);
  }
}
