import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/** Publica en Instagram una publicación del calendario ya aprobada. */
export class PublicarPublicacionDto {
  @ApiProperty({ description: 'Publicación del calendario a publicar en Instagram.' })
  @IsString()
  publicacionId!: string;
}
