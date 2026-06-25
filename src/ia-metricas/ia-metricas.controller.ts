import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { IaMetricasService } from './ia-metricas.service';
import { AnalizarMetricasDto } from './dto/analizar-metricas.dto';
import { FiltrarHistorialDto } from './dto/filtrar-historial.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('ia-metricas')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('ia-metricas')
export class IaMetricasController {
  constructor(private readonly iaMetricas: IaMetricasService) {}

  @Post('analizar')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @HttpCode(200)
  @ApiOperation({ summary: 'Analiza las métricas de un cliente con IA y devuelve interpretación + recomendaciones.' })
  analizar(@OrgActual() organizacionId: string, @Body() dto: AnalizarMetricasDto) {
    return this.iaMetricas.analizar(organizacionId, dto);
  }

  @Get('historial')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @ApiOperation({ summary: 'Historial de análisis de métricas generados por IA.' })
  historial(@OrgActual() organizacionId: string, @Query() filtros: FiltrarHistorialDto) {
    return this.iaMetricas.historial(organizacionId, filtros);
  }
}
