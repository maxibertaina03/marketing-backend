import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TipoArchivo } from '@prisma/client';

/**
 * Actualización parcial de un archivo. No incluye `clienteId`: un archivo no
 * cambia de marca. `publicacionId` puede asociarse/desasociarse.
 */
export class ActualizarArchivoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string;

  @ApiPropertyOptional({ description: 'Asociar a una publicación, o null para desasociar.' })
  @IsOptional()
  @IsString()
  publicacionId?: string | null;

  @ApiPropertyOptional({ enum: TipoArchivo })
  @IsOptional()
  @IsEnum(TipoArchivo)
  tipo?: TipoArchivo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tamanoBytes?: number;
}
