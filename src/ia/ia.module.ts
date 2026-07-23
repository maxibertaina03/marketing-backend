import { Module } from '@nestjs/common';
import { ServicioIa } from './servicio-ia';
import { ConsumoIaService } from './consumo-ia.service';
import { ConsumoIaController } from './consumo-ia.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

/**
 * Infraestructura común del Centro de IA (Fase 2) y el control de consumo (Fase 6).
 * Exporta `ServicioIa` para que el resto de los módulos de IA lo consuman.
 */
@Module({
  imports: [NotificacionesModule],
  controllers: [ConsumoIaController],
  providers: [ServicioIa, ConsumoIaService],
  exports: [ServicioIa, ConsumoIaService],
})
export class IaModule {}
