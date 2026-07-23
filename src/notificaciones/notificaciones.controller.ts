import { Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { MotorReglasService } from './motor-reglas.service';
import { GuardJobSecret } from '../automatizaciones/guard-job-secret';
import { Publico } from '../comun/decoradores/publico.decorator';
import { OrgActual, UsuarioActual } from '../comun/decoradores/contexto-actual.decorator';

interface UsuarioPeticion {
  id: string;
}

@ApiTags('notificaciones')
@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificaciones: NotificacionesService,
    private readonly motor: MotorReglasService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Avisos del usuario en la organización activa (no leídos primero).' })
  listar(@OrgActual() organizacionId: string, @UsuarioActual() usuario: UsuarioPeticion) {
    return this.notificaciones.listar(organizacionId, usuario.id);
  }

  @Get('conteo')
  @ApiOperation({ summary: 'Cantidad de avisos sin leer (para el globito de la campanita).' })
  conteo(@OrgActual() organizacionId: string, @UsuarioActual() usuario: UsuarioPeticion) {
    return this.notificaciones.contarSinLeer(organizacionId, usuario.id);
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marca un aviso como leído.' })
  marcarLeida(
    @OrgActual() organizacionId: string,
    @UsuarioActual() usuario: UsuarioPeticion,
    @Param('id') id: string,
  ) {
    return this.notificaciones.marcarLeida(organizacionId, usuario.id, id);
  }

  @Post('leer-todas')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marca todos los avisos del usuario como leídos.' })
  marcarTodasLeidas(
    @OrgActual() organizacionId: string,
    @UsuarioActual() usuario: UsuarioPeticion,
  ) {
    return this.notificaciones.marcarTodasLeidas(organizacionId, usuario.id);
  }

  // La llama el cron diario (sin sesión de usuario): la protege el x-job-secret.
  @Post('evaluar-reglas')
  @Publico()
  @UseGuards(GuardJobSecret)
  @HttpCode(200)
  @ApiOperation({ summary: 'Job: evalúa las reglas de notificación de todas las organizaciones.' })
  evaluarReglas() {
    return this.motor.evaluarTodas();
  }
}
