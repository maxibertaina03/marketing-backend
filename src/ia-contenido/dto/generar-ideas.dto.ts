import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BaseGeneracionDto } from './base-generacion.dto';

/** Botón "Ideas de contenido": genera ideas variadas alineadas a la marca. */
export class GenerarIdeasDto extends BaseGeneracionDto {
  @ApiPropertyOptional({ example: 5, default: 5, description: 'Cuántas ideas generar (1-20).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cantidad?: number;

  @ApiPropertyOptional({ example: 'lanzamiento de la nueva línea de café de especialidad' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  tema?: string;
}
