import { Module } from '@nestjs/common';
import { MembresiasController } from './membresias.controller';
import { MembresiasService } from './membresias.service';

@Module({
  controllers: [MembresiasController],
  providers: [MembresiasService],
  exports: [MembresiasService],
})
export class MembresiasModule {}
