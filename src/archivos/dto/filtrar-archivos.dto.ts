import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoArchivo } from '@prisma/client';

/** Filtros para listar archivos de la organización. */
export class FiltrarArchivosDto {
  @ApiPropertyOptional({ description: 'Archivos de un cliente (marca).' })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Archivos asociados a una publicación.' })
  @IsOptional()
  @IsString()
  publicacionId?: string;

  @ApiPropertyOptional({ enum: TipoArchivo })
  @IsOptional()
  @IsEnum(TipoArchivo)
  tipo?: TipoArchivo;
}
