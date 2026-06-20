import { Module } from '@nestjs/common';
import { EstrategiaMarcaController } from './estrategia-marca.controller';
import { EstrategiaMarcaService } from './estrategia-marca.service';

@Module({
  controllers: [EstrategiaMarcaController],
  providers: [EstrategiaMarcaService],
})
export class EstrategiaMarcaModule {}
