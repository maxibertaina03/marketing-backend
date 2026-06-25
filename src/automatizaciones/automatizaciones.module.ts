import { Module } from '@nestjs/common';
import { AutomatizacionesController } from './automatizaciones.controller';
import { AutomatizacionesService } from './automatizaciones.service';
import { InformesModule } from '../informes/informes.module';

@Module({
  imports: [InformesModule],
  controllers: [AutomatizacionesController],
  providers: [AutomatizacionesService],
})
export class AutomatizacionesModule {}
