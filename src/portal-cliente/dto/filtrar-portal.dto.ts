import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoContenido } from '@prisma/client';

// El cliente no puede ver borradores: solo los estados post-envío.
const ESTADOS_VISIBLES = [
  EstadoContenido.EN_REVISION,
  EstadoContenido.APROBADO,
  EstadoContenido.RECHAZADO,
  EstadoContenido.PROGRAMADO,
  EstadoContenido.PUBLICADO,
] as const;

export class FiltrarPortalDto {
  @ApiPropertyOptional({ enum: ESTADOS_VISIBLES })
  @IsOptional()
  @IsEnum(EstadoContenido)
  estado?: EstadoContenido;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) pagina?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) limite?: number = 20;
}
