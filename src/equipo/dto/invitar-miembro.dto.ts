import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { Rol } from '@prisma/client';

/** Invita a alguien (por email) a la organización con un rol. */
export class InvitarMiembroDto {
  @ApiProperty({ example: 'colega@agencia.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Rol, example: Rol.COMMUNITY_MANAGER })
  @IsEnum(Rol)
  rol!: Rol;
}
