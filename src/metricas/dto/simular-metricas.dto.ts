import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Genera métricas de prueba para un cliente (mientras no esté la ingesta real de
 * Meta). Útil para desarrollar el dashboard y la IA de Métricas sin datos reales.
 */
export class SimularMetricasDto {
  @ApiProperty({ description: 'Cliente (marca) para el que generar datos de prueba.' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({ default: 14, description: 'Cantidad de días hacia atrás (1-90).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  dias?: number;
}
