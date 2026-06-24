import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { IaCampanasController } from './ia-campanas.controller';
import { IaCampanasService } from './ia-campanas.service';

@Module({
  imports: [IaModule],
  controllers: [IaCampanasController],
  providers: [IaCampanasService],
})
export class IaCampanasModule {}
