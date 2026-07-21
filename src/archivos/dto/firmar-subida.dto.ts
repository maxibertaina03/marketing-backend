import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Pide una firma para subir un archivo directo a Cloudinary desde el navegador.
 * El archivo NO pasa por el backend: acá solo se firma la operación.
 */
export class FirmarSubidaDto {
  @ApiProperty({ description: 'Cliente (marca) dueño del archivo; define la carpeta destino.' })
  @IsString()
  clienteId!: string;
}
