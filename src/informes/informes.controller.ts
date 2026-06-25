import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { InformesService } from './informes.service';
import { GenerarInformeDto } from './dto/generar-informe.dto';
import { FiltrarInformesDto } from './dto/filtrar-informes.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('informes')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('informes')
export class InformesController {
  constructor(private readonly informes: InformesService) {}

  @Post('generar')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(200)
  @ApiOperation({ summary: 'Genera (o regenera) el informe mensual IA de un cliente para un período.' })
  generar(@OrgActual() organizacionId: string, @Body() dto: GenerarInformeDto) {
    return this.informes.generar(organizacionId, dto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA, Rol.CLIENTE)
  @ApiOperation({ summary: 'Lista informes del tenant (filtrable por clienteId).' })
  listar(@OrgActual() organizacionId: string, @Query() filtros: FiltrarInformesDto) {
    return this.informes.listar(organizacionId, filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA, Rol.CLIENTE)
  @ApiOperation({ summary: 'Devuelve el detalle completo de un informe.' })
  obtener(@OrgActual() organizacionId: string, @Param('id') id: string) {
    return this.informes.obtener(organizacionId, id);
  }
}
