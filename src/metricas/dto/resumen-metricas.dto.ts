import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Parámetros del resumen agregado que consume el Dashboard por cliente. */
export class ResumenMetricasDto {
  @ApiProperty({ description: 'Cliente (marca) del dashboard.' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}
