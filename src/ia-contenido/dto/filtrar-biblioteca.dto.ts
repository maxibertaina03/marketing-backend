import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TipoBotonIa } from '@prisma/client';

/** Filtros para la Biblioteca de Copys/contenido (lectura de generaciones). */
export class FiltrarBibliotecaDto {
  @ApiPropertyOptional({ description: 'Filtra por cliente (marca).' })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiPropertyOptional({ enum: TipoBotonIa, description: 'Filtra por tipo de botón.' })
  @IsOptional()
  @IsEnum(TipoBotonIa)
  tipoBoton?: TipoBotonIa;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Resultados por página (1-100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
