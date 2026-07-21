import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerarOportunidadesDto {
  @ApiProperty({ description: 'ID del cliente cuya marca se analiza' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategiaId?: string;
}
