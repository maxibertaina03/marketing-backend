import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerarBuyerPersonaDto {
  @ApiProperty({ description: 'ID del cliente cuya marca se usa' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategiaId?: string;
}
