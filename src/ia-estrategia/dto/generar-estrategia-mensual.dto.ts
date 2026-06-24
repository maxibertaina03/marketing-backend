import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerarEstrategiaMensualDto {
  @ApiProperty({ description: 'ID del cliente cuya marca se usa como contexto' })
  @IsString()
  clienteId!: string;

  @ApiPropertyOptional({ description: 'ID de la estrategia de marca (si la tiene)' })
  @IsOptional()
  @IsString()
  estrategiaId?: string;

  @ApiPropertyOptional({ description: 'Mes (1-12). Default: mes actual.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @ApiPropertyOptional({ description: 'Año. Default: año actual.' })
  @IsOptional()
  @IsInt()
  @Min(2024)
  anio?: number;
}
