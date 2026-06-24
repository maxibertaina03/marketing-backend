import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Campos comunes a todos los botones de IA de Contenido: identifican la marca
 * (de donde sale el contexto cacheado) y, opcionalmente, la red objetivo.
 */
export class BaseGeneracionDto {
  @ApiProperty({
    description: 'Cliente (marca) para el que se genera. Aporta el contexto de marca.',
  })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({
    description:
      'Estrategia de marca a usar como contexto. Si se omite, se usa la más reciente del cliente.',
  })
  @IsOptional()
  @IsString()
  estrategiaId?: string;

  @ApiPropertyOptional({
    example: 'instagram',
    description: 'Red social objetivo (instagram, tiktok, linkedin…).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  red?: string;
}
