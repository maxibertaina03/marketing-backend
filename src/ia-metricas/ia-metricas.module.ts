import { Module } from '@nestjs/common';
import { IaMetricasController } from './ia-metricas.controller';
import { IaMetricasService } from './ia-metricas.service';
import { IaModule } from '../ia/ia.module';

@Module({
  imports: [IaModule],
  controllers: [IaMetricasController],
  providers: [IaMetricasService],
  exports: [IaMetricasService],
})
export class IaMetricasModule {}
