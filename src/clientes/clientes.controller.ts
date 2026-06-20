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
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { FiltrarClientesDto } from './dto/filtrar-clientes.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Gestión de clientes (marcas) de la organización activa.
 * Leer: cualquier miembro. Crear/editar/eliminar: ADMIN o COMMUNITY_MANAGER.
 */
@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Crea un cliente en la organización activa.' })
  crear(@OrgActual() organizacionId: string, @Body() dto: CrearClienteDto) {
    return this.clientes.crear(organizacionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los clientes de la organización (filtros: estado, busqueda).' })
  listar(@OrgActual() organizacionId: string, @Query() filtros: FiltrarClientesDto) {
    return this.clientes.listar(organizacionId, filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve un cliente por id.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.clientes.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Actualiza un cliente.' })
  actualizar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.clientes.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Elimina un cliente.' })
  eliminar(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.clientes.eliminar(organizacionId, id);
  }
}
