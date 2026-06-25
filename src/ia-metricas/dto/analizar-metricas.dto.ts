import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalizarMetricasDto {
  @ApiProperty() @IsString() clienteId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() estrategiaId?: string;
  @ApiPropertyOptional({ description: 'Fecha inicio YYYY-MM-DD. Default: 30 días atrás.' })
  @IsOptional() @IsDateString() desde?: string;
  @ApiPropertyOptional({ description: 'Fecha fin YYYY-MM-DD. Default: hoy.' })
  @IsOptional() @IsDateString() hasta?: string;
}
