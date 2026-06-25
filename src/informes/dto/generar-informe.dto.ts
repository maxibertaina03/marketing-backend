import { IsString, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerarInformeDto {
  @ApiProperty() @IsString() clienteId!: string;
  @ApiPropertyOptional({ description: 'Período YYYYMM. Default: mes anterior.' })
  @IsOptional() @IsString() @Matches(/^\d{6}$/, { message: 'periodo debe tener formato YYYYMM' })
  periodo?: string;
}
