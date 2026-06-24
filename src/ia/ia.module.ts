import { Module } from '@nestjs/common';
import { ServicioIa } from './servicio-ia';

/**
 * Infraestructura común del Centro de IA (Fase 2).
 * Exporta `ServicioIa` para que el resto de los módulos de IA lo consuman.
 */
@Module({
  providers: [ServicioIa],
  exports: [ServicioIa],
})
export class IaModule {}
