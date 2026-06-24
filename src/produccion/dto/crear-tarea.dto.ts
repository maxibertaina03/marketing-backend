import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EstadoTarea, TipoTarea } from '@prisma/client';

/** Datos para crear una tarea de producción sobre una publicación. */
export class CrearTareaDto {
  @ApiProperty({ example: 'Diseñar el carrusel de lanzamiento' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @ApiPropertyOptional({ example: 'Usar la paleta de la marca; 6 slides.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Publicación a la que pertenece la tarea.' })
  @IsString()
  publicacionId!: string;

  @ApiPropertyOptional({ enum: TipoTarea, default: TipoTarea.OTRO })
  @IsOptional()
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @ApiPropertyOptional({ enum: EstadoTarea, default: EstadoTarea.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @ApiPropertyOptional({ description: 'Membresía (miembro de la org) responsable de la tarea.' })
  @IsOptional()
  @IsString()
  asignadoId?: string;

  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    description: 'Fecha límite (ISO-8601).',
  })
  @IsOptional()
  @IsDateString()
  fechaLimite?: string;
}
