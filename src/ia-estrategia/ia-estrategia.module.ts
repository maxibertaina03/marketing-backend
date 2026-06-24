import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { IaEstrategiaController } from './ia-estrategia.controller';
import { IaEstrategiaService } from './ia-estrategia.service';

@Module({
  imports: [IaModule],
  controllers: [IaEstrategiaController],
  providers: [IaEstrategiaService],
})
export class IaEstrategiaModule {}
