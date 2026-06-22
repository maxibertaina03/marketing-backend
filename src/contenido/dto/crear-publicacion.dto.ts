import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Canal, EstadoContenido } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearPublicacionDto {
  @ApiProperty({ example: 'Lanzamiento producto verano', description: 'Título de la publicación.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titulo!: string;

  @ApiProperty({ description: 'ID del cliente al que pertenece la publicación.' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({
    description:
      'ID de la estrategia de marca (opcional). Si se indica, debe ser del mismo cliente.',
  })
  @IsOptional()
  @IsString()
  estrategiaId?: string;

  @ApiProperty({ example: '¡El verano llegó! Descubrí nuestra nueva colección...' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  contenido!: string;

  @ApiProperty({ enum: Canal })
  @IsEnum(Canal)
  canal!: Canal;

  @ApiPropertyOptional({ enum: EstadoContenido, default: EstadoContenido.BORRADOR })
  @IsOptional()
  @IsEnum(EstadoContenido)
  estado?: EstadoContenido;

  @ApiPropertyOptional({
    example: '2024-06-15T10:00:00.000Z',
    description: 'Fecha y hora programada de publicación.',
  })
  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/imagen.jpg' })
  @IsOptional()
  @IsUrl()
  imagenUrl?: string;
}
