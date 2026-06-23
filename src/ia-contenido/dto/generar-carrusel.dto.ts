import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BaseGeneracionDto } from './base-generacion.dto';

/** Botón "Carrusel": genera un carrusel (slides + caption + hashtags). */
export class GenerarCarruselDto extends BaseGeneracionDto {
  @ApiProperty({ example: '5 mitos sobre el café de especialidad' })
  @IsString()
  @MaxLength(280)
  tema!: string;

  @ApiPropertyOptional({ example: 6, default: 6, description: 'Cantidad de slides (2-10).' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  cantidadSlides?: number;
}
