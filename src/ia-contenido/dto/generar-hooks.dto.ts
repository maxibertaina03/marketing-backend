import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BaseGeneracionDto } from './base-generacion.dto';

/** Botón "Hooks": genera ganchos de apertura para una pieza concreta. */
export class GenerarHooksDto extends BaseGeneracionDto {
  @ApiProperty({ example: 'reel mostrando el proceso de tostado del café' })
  @IsString()
  @MaxLength(280)
  tema!: string;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Cuántos hooks generar (1-20).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cantidad?: number;
}
