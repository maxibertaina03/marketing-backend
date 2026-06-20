import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EstadoCliente } from '@prisma/client';

/** Datos para crear un cliente (la marca que gestiona la agencia). */
export class CrearClienteDto {
  @ApiProperty({ example: 'Café del Centro', description: 'Nombre de la marca.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Gastronomía' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  rubro?: string;

  @ApiPropertyOptional({ example: 'Córdoba, Argentina' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  ubicacion?: string;

  @ApiPropertyOptional({ example: 'https://cafedelcentro.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sitioWeb?: string;

  @ApiPropertyOptional({ example: 'Juana Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactoNombre?: string;

  @ApiPropertyOptional({ example: 'contacto@cafedelcentro.com' })
  @IsOptional()
  @IsEmail()
  contactoEmail?: string;

  @ApiPropertyOptional({ example: '+54 351 1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactoTelefono?: string;

  @ApiPropertyOptional({
    description: 'Redes sociales: { instagram, facebook, tiktok, linkedin, ... }.',
    example: { instagram: '@cafedelcentro', tiktok: '@cafedelcentro' },
  })
  @IsOptional()
  @IsObject()
  redes?: Record<string, string>;

  @ApiPropertyOptional({ example: 'https://.../logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Colores de marca en hex (#RRGGBB).',
    example: ['#6F4E37', '#C0A080'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paletaColores?: string[];

  @ApiPropertyOptional({ example: 'Cercano, cálido, descontracturado.' })
  @IsOptional()
  @IsString()
  tono?: string;

  @ApiPropertyOptional({ example: 'Adultos jóvenes 25-40, amantes del café de especialidad.' })
  @IsOptional()
  @IsString()
  publicoObjetivo?: string;

  @ApiPropertyOptional({ example: 'Café de especialidad, pastelería artesanal.' })
  @IsOptional()
  @IsString()
  productosServicios?: string;

  @ApiPropertyOptional({ example: 'Aumentar reservas y ventas de fin de semana.' })
  @IsOptional()
  @IsString()
  objetivos?: string;

  @ApiPropertyOptional({ example: 'Otras cafeterías de especialidad del centro.' })
  @IsOptional()
  @IsString()
  competencia?: string;

  @ApiPropertyOptional({ example: '2x1 en cafés los martes.' })
  @IsOptional()
  @IsString()
  promociones?: string;

  @ApiPropertyOptional({ enum: EstadoCliente, default: EstadoCliente.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoCliente)
  estado?: EstadoCliente;
}
