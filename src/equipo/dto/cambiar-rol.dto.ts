import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Rol } from '@prisma/client';

/** Cambia el rol de un miembro de la organización. */
export class CambiarRolDto {
  @ApiProperty({ enum: Rol, example: Rol.DISENADOR })
  @IsEnum(Rol)
  rol!: Rol;

  @ApiPropertyOptional({
    description: 'Marca que representa, cuando el rol es CLIENTE. Se ignora para otros roles.',
  })
  @IsOptional()
  @IsString()
  clienteId?: string;
}
