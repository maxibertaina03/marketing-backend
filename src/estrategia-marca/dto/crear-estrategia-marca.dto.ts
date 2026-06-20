import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TonoComunicacion } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearEstrategiaMarcaDto {
  @ApiProperty({
    example: 'Estrategia Principal 2024',
    description: 'Nombre identificador de la estrategia.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ description: 'ID del cliente al que pertenece la estrategia.' })
  @IsString()
  clienteId!: string;

  @ApiProperty({ example: 'Posicionar la marca como referente en innovación sustentable.' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  objetivo!: string;

  @ApiProperty({
    example: 'Profesionales de 25-40 años interesados en tecnología y sustentabilidad.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  publicoObjetivo!: string;

  @ApiProperty({ enum: TonoComunicacion, default: TonoComunicacion.PROFESIONAL })
  @IsEnum(TonoComunicacion)
  tono!: TonoComunicacion;

  @ApiProperty({ type: [String], example: ['Innovación', 'Sustentabilidad', 'Calidad'] })
  @IsArray()
  @IsString({ each: true })
  pilares!: string[];

  @ApiPropertyOptional({ example: 'Evitar lenguaje técnico excesivo. No usar argot informal.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  restricciones?: string;
}
