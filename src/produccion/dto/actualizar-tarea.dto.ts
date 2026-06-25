import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EstadoTarea, TipoTarea } from '@prisma/client';

/**
 * Actualización parcial de una tarea. No incluye `publicacionId`: una tarea no
 * se mueve de publicación (si hace falta, se crea otra).
 */
export class ActualizarTareaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ enum: TipoTarea })
  @IsOptional()
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;

  @ApiPropertyOptional({ enum: EstadoTarea })
  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @ApiPropertyOptional({ description: 'Reasignar a otra membresía, o null para desasignar.' })
  @IsOptional()
  @IsString()
  asignadoId?: string | null;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fechaLimite?: string;
}
