import { Module } from '@nestjs/common';
import { PlanesModule } from '../planes/planes.module';
import { EquipoController } from './equipo.controller';
import { EquipoService } from './equipo.service';

@Module({
  imports: [PlanesModule],
  controllers: [EquipoController],
  providers: [EquipoService],
  exports: [EquipoService],
})
export class EquipoModule {}
