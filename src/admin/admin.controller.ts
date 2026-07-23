import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Usuario } from '@prisma/client';
import { AdminService } from './admin.service';
import { GuardSuperadmin } from './guard-superadmin';
import { UsuarioActual } from '../comun/decoradores/contexto-actual.decorator';
import { CambiarPlanDto } from './dto/cambiar-plan.dto';
import { AjustarLimitesDto } from './dto/ajustar-limites.dto';

/**
 * Portal de superadministración. Todo cuelga de `GuardSuperadmin`: solo los
 * emails de `SUPERADMINS` entran. No usa `@Roles` ni contexto de organización:
 * está por encima de las agencias.
 */
@ApiTags('admin')
@UseGuards(GuardSuperadmin)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('agencias')
  @ApiOperation({ summary: 'Lista todas las agencias con plan, uso y consumo de IA del mes.' })
  listarAgencias() {
    return this.admin.listarAgencias();
  }

  @Get('consumo-total')
  @ApiOperation({ summary: 'Consumo de IA de toda la plataforma en el mes en curso.' })
  consumoTotal() {
    return this.admin.consumoTotal();
  }

  @Get('auditoria')
  @ApiOperation({ summary: 'Últimas acciones del portal (quién cambió qué).' })
  auditoria() {
    return this.admin.auditoria();
  }

  @Patch('agencias/:id/plan')
  @ApiOperation({ summary: 'Cambia el plan de una agencia.' })
  cambiarPlan(
    @UsuarioActual() usuario: Usuario,
    @Param('id') id: string,
    @Body() dto: CambiarPlanDto,
  ) {
    return this.admin.cambiarPlan(usuario.email, id, dto);
  }

  @Patch('agencias/:id/limites')
  @ApiOperation({
    summary: 'Ajusta los límites de una agencia (overrides; null = usar el del plan).',
  })
  ajustarLimites(
    @UsuarioActual() usuario: Usuario,
    @Param('id') id: string,
    @Body() dto: AjustarLimitesDto,
  ) {
    return this.admin.ajustarLimites(usuario.email, id, dto);
  }

  @Post('agencias/:id/reiniciar-cuota')
  @ApiOperation({ summary: 'Reinicia la cuota de IA del mes en curso de una agencia.' })
  reiniciarCuota(@UsuarioActual() usuario: Usuario, @Param('id') id: string) {
    return this.admin.reiniciarCuota(usuario.email, id);
  }

  @Post('agencias/:id/suspension')
  @ApiOperation({ summary: 'Suspende o reactiva una agencia (?activar=true para reactivar).' })
  suspension(
    @UsuarioActual() usuario: Usuario,
    @Param('id') id: string,
    @Query('activar') activar?: string,
  ) {
    // Por defecto suspende; con ?activar=true reactiva.
    return this.admin.suspender(usuario.email, id, activar !== 'true');
  }
}
