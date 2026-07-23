import { Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { MotorReglasService } from './motor-reglas.service';

/**
 * Centro de notificaciones (Fase 6).
 *
 * Exporta `NotificacionesService` para que cualquier módulo pueda emitir un aviso
 * por evento: importá `NotificacionesModule` e inyectá el servicio.
 */
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService, MotorReglasService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
