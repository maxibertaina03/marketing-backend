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
import { Rol } from '@prisma/client';
import { EstrategiaMarcaService } from './estrategia-marca.service';
import { CrearEstrategiaMarcaDto } from './dto/crear-estrategia-marca.dto';
import { ActualizarEstrategiaMarcaDto } from './dto/actualizar-estrategia-marca.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { Roles } from '../comun/decoradores/roles.decorator';

@ApiTags('estrategia-marca')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('estrategia-marca')
export class EstrategiaMarcaController {
  constructor(private readonly estrategias: EstrategiaMarcaService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Crea una nueva estrategia de marca para un cliente.' })
  crear(@OrgActual() organizacionId: string, @Body() dto: CrearEstrategiaMarcaDto) {
    return this.estrategias.crear(organizacionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas las estrategias de marca de la organización.' })
  @ApiQuery({ name: 'clienteId', required: false, description: 'Filtra por cliente.' })
  listar(@OrgActual() organizacionId: string, @Query('clienteId') clienteId?: string) {
    return this.estrategias.listar(organizacionId, clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve una estrategia de marca con sus últimas publicaciones.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.estrategias.obtener(organizacionId, id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Actualiza una estrategia de marca.' })
  actualizar(
    @OrgActual() organizacionId: string,
    @Param('id') id: string,
    @Body() dto: ActualizarEstrategiaMarcaDto,
  ) {
    return this.estrategias.actualizar(organizacionId, id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una estrategia de marca y su contenido asociado.' })
  eliminar(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.estrategias.eliminar(organizacionId, id);
  }
}
