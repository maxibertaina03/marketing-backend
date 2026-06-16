import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Datos para crear una organización (agencia). */
export class CrearOrganizacionDto {
  @ApiProperty({ example: 'Agencia Creativa SRL', description: 'Nombre de la agencia.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;
}
