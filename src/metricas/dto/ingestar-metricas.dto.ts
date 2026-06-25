import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Una fila de métricas de una publicación en una fecha (snapshot). */
export class MetricaInputDto {
  @ApiProperty({ description: 'Publicación a la que pertenecen las métricas.' })
  @IsString()
  publicacionId!: string;

  @ApiProperty({ example: '2026-06-25', description: 'Fecha del snapshot (ISO-8601, día).' })
  @IsDateString()
  fecha!: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) impresiones?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) alcance?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) meGusta?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) comentarios?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) compartidos?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) guardados?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) clics?: number;
}

/**
 * Lote de métricas a ingestar. El `clienteId`, `canal` y `organizacionId` se
 * derivan de cada publicación (no se mandan). Re-ingestar (publicacion, fecha)
 * actualiza la fila existente.
 */
export class IngestarMetricasDto {
  @ApiProperty({ type: [MetricaInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MetricaInputDto)
  metricas!: MetricaInputDto[];
}
