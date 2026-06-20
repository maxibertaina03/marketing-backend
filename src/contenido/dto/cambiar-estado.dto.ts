import { ApiProperty } from '@nestjs/swagger';
import { EstadoContenido } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CambiarEstadoDto {
  @ApiProperty({ enum: EstadoContenido })
  @IsEnum(EstadoContenido)
  estado!: EstadoContenido;
}
