import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerarPilaresDto {
  @ApiProperty()
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estrategiaId?: string;

  @ApiPropertyOptional({ description: 'Cantidad de pilares a sugerir (default 5)', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  cantidad?: number;
}
