import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FiltrarInformesDto {
  @ApiPropertyOptional() @IsOptional() @IsString() clienteId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) pagina?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Type(() => Number) limite?: number = 20;
}
