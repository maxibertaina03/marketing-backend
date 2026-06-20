import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Rol } from '@prisma/client';

/** Cambia el rol de un miembro de la organización. */
export class CambiarRolDto {
  @ApiProperty({ enum: Rol, example: Rol.DISENADOR })
  @IsEnum(Rol)
  rol!: Rol;
}
