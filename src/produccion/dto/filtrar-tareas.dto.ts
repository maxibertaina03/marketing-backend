import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoTarea, TipoTarea } from '@prisma/client';

/** Filtros para listar tareas / armar el tablero de producción. */
export class FiltrarTareasDto {
  @ApiPropertyOptional({ description: 'Tareas de una publicación.' })
  @IsOptional()
  @IsString()
  publicacionId?: string;

  @ApiPropertyOptional({ description: 'Tareas asignadas a una membresía.' })
  @IsOptional()
  @IsString()
  asignadoId?: string;

  @ApiPropertyOptional({ enum: EstadoTarea })
  @IsOptional()
  @IsEnum(EstadoTarea)
  estado?: EstadoTarea;

  @ApiPropertyOptional({ enum: TipoTarea })
  @IsOptional()
  @IsEnum(TipoTarea)
  tipo?: TipoTarea;
}
