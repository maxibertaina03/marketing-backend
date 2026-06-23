import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { IaContenidoController } from './ia-contenido.controller';
import { IaContenidoService } from './ia-contenido.service';

/**
 * IA de Contenido (Fase 2). Consume `ServicioIa` (vía IaModule) para los botones
 * de generación y la Biblioteca de Copys.
 */
@Module({
  imports: [IaModule],
  controllers: [IaContenidoController],
  providers: [IaContenidoService],
})
export class IaContenidoModule {}
