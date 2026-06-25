import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Filtros para listar métricas crudas (las consume la IA de Métricas / Informes). */
export class FiltrarMetricasDto {
  @ApiPropertyOptional({ description: 'Métricas de un cliente (marca).' })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Métricas de una publicación.' })
  @IsOptional()
  @IsString()
  publicacionId?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Desde (inclusive).' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Hasta (inclusive).' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}
