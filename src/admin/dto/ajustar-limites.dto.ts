import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Overrides de límites de una organización. Cada campo es opcional: enviar `null`
 * borra el override (vuelve al límite del plan); omitirlo lo deja igual.
 */
export class AjustarLimitesDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  limiteMarcas?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  limiteUsuariosInternos?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  limiteGeneracionesIa?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  limiteIaPorUsuario?: number | null;
}
