import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RechazarDto {
  @ApiProperty({ description: 'Motivo del rechazo (obligatorio).' })
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
