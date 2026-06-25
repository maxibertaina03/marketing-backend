import { Module } from '@nestjs/common';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';
import { IaMetricasModule } from '../ia-metricas/ia-metricas.module';

@Module({
  imports: [IaMetricasModule],
  controllers: [InformesController],
  providers: [InformesService],
  exports: [InformesService],
})
export class InformesModule {}
