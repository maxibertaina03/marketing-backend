import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TipoArchivo } from '@prisma/client';

/**
 * Registra un archivo de la marca (MVP: solo metadata + URL al hosting externo).
 * El archivo en sí vive afuera; acá guardamos su referencia.
 */
export class CrearArchivoDto {
  @ApiProperty({ example: 'carrusel-lanzamiento.png' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/.../carrusel.png',
    description: 'URL pública del archivo.',
  })
  @IsString()
  @MaxLength(1000)
  url!: string;

  @ApiProperty({ description: 'Cliente (marca) dueño del archivo.' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({ description: 'Publicación asociada (opcional).' })
  @IsOptional()
  @IsString()
  publicacionId?: string;

  @ApiPropertyOptional({ enum: TipoArchivo, default: TipoArchivo.OTRO })
  @IsOptional()
  @IsEnum(TipoArchivo)
  tipo?: TipoArchivo;

  @ApiPropertyOptional({ example: 245680, description: 'Tamaño en bytes (informativo).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tamanoBytes?: number;
}
