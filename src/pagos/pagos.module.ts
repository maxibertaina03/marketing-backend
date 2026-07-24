import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

/** Cobro de suscripciones con Mercado Pago (Fase 6, Sprint 3). */
@Module({
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
