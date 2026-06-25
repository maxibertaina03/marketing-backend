import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AprobarDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comentario?: string;
}
