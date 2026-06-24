import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseGeneracionDto } from './base-generacion.dto';

/** Botón "Copy": genera el copy de una publicación a partir de un brief. */
export class GenerarCopyDto extends BaseGeneracionDto {
  @ApiProperty({ example: 'promo 2x1 en cafés todos los martes de julio' })
  @IsString()
  @MaxLength(500)
  brief!: string;

  @ApiPropertyOptional({ example: 'Reservá tu mesa', description: 'Llamado a la acción deseado.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cta?: string;
}
