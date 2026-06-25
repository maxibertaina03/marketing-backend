import { Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AutomatizacionesService } from './automatizaciones.service';
import { GuardJobSecret } from './guard-job-secret';
import { Publico } from '../comun/decoradores/publico.decorator';

@ApiTags('automatizaciones')
@Publico()
@UseGuards(GuardJobSecret)
@Controller('automatizaciones')
export class AutomatizacionesController {
  constructor(private readonly automatizaciones: AutomatizacionesService) {}

  @Post('publicar-programadas')
  @HttpCode(200)
  @ApiOperation({ summary: 'Job: mueve publicaciones APROBADO+fechaProgramada≤now() → PUBLICADO.' })
  publicarProgramadas() {
    return this.automatizaciones.publicarProgramadas();
  }

  @Post('generar-informes-mensuales')
  @HttpCode(200)
  @ApiOperation({ summary: 'Job: genera informes del mes anterior para todos los clientes activos.' })
  generarInformesMensuales() {
    return this.automatizaciones.generarInformesMensuales();
  }

  @Get('historial')
  @ApiOperation({ summary: 'Log de ejecuciones de jobs.' })
  @ApiQuery({ name: 'tipo', required: false })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  historial(
    @Query('tipo') tipo?: string,
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
  ) {
    return this.automatizaciones.historial({ tipo, pagina: pagina ? Number(pagina) : 1, limite: limite ? Number(limite) : 20 });
  }
}
