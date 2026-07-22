import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { MetricasService } from './metricas.service';
import { IngestarMetricasDto } from './dto/ingestar-metricas.dto';
import { FiltrarMetricasDto } from './dto/filtrar-metricas.dto';
import { ResumenMetricasDto } from './dto/resumen-metricas.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Métricas de publicaciones (Fase 4). Ingesta (Meta), lectura cruda (IA/Informes)
 * y resumen agregado (Dashboard por cliente). Leer: ADMIN, CM, ANALISTA.
 */
@ApiTags('metricas')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricas: MetricasService) {}

  @Post('ingestar')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Ingesta un lote de métricas (upsert por publicación+fecha).' })
  ingestar(@OrgActual() organizacionId: string, @Body() dto: IngestarMetricasDto) {
    return this.metricas.ingestar(organizacionId, dto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @ApiOperation({
    summary: 'Lista métricas crudas (filtros: clienteId, publicacionId, desde, hasta).',
  })
  listar(@OrgActual() organizacionId: string, @Query() filtros: FiltrarMetricasDto) {
    return this.metricas.listar(organizacionId, filtros);
  }

  @Get('detalle')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @ApiOperation({
    summary: 'Detalle por publicación: fecha de publicación, total y evolución diaria.',
  })
  detalle(@OrgActual() organizacionId: string, @Query() dto: ResumenMetricasDto) {
    return this.metricas.detalle(organizacionId, dto);
  }

  @Get('resumen')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @ApiOperation({ summary: 'Resumen agregado de un cliente (totales, por canal, serie temporal).' })
  resumen(@OrgActual() organizacionId: string, @Query() dto: ResumenMetricasDto) {
    return this.metricas.resumen(organizacionId, dto);
  }
}
