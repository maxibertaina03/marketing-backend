import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Canal } from '@prisma/client';

export class GenerarCampanaDto {
  @ApiProperty({ description: 'ID del cliente cuya marca se usa como contexto' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategiaId?: string;

  @ApiProperty({ description: 'Nombre de la campaña', example: 'Lanzamiento verano 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ description: 'Objetivo principal de la campaña', example: 'Aumentar ventas de bikinis un 30%' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  objetivo!: string;

  @ApiPropertyOptional({ description: 'Duración en días', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(7)
  duracionDias?: number;

  @ApiPropertyOptional({ description: 'Canales donde se ejecutará la campaña', enum: Canal, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  canales?: Canal[];

  @ApiPropertyOptional({ description: 'Presupuesto estimado', example: 'USD 500' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  presupuesto?: string;
}
