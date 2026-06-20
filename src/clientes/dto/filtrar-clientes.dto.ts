import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoCliente } from '@prisma/client';

/** Filtros para listar clientes de la organización. */
export class FiltrarClientesDto {
  @ApiPropertyOptional({ enum: EstadoCliente, description: 'Filtra por estado.' })
  @IsOptional()
  @IsEnum(EstadoCliente)
  estado?: EstadoCliente;

  @ApiPropertyOptional({ description: 'Busca por nombre o rubro (coincidencia parcial).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  busqueda?: string;
}
