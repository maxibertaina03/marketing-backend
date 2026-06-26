import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/** Identifica el cliente (marca) sobre el que se opera la conexión con Meta. */
export class ClienteMetaDto {
  @ApiProperty({ description: 'Cliente (marca) a conectar / consultar / sincronizar.' })
  @IsString()
  clienteId!: string;
}
