import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { FiltrarClientesDto } from './dto/filtrar-clientes.dto';

/**
 * Lógica de clientes (marcas). Toda operación queda acotada a la organización
 * activa: nunca se accede a un cliente de otra organización (multi-tenant).
 */
@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea un cliente dentro de la organización. */
  async crear(organizacionId: string, dto: CrearClienteDto) {
    return this.prisma.cliente.create({
      data: { ...dto, paletaColores: dto.paletaColores ?? [], organizacionId },
    });
  }

  /** Lista los clientes de la organización, con filtros opcionales por estado y búsqueda. */
  async listar(organizacionId: string, filtros: FiltrarClientesDto) {
    const where: Prisma.ClienteWhereInput = { organizacionId };

    if (filtros.estado) {
      where.estado = filtros.estado;
    }
    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { rubro: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    return this.prisma.cliente.findMany({ where, orderBy: { creadoEn: 'desc' } });
  }

  /** Devuelve un cliente de la organización o lanza 404 si no existe / no es de la org. */
  async obtener(organizacionId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id, organizacionId } });
    if (!cliente) {
      throw new NotFoundException('El cliente no existe en esta organización.');
    }
    return cliente;
  }

  /** Actualiza parcialmente un cliente de la organización. */
  async actualizar(organizacionId: string, id: string, dto: ActualizarClienteDto) {
    await this.obtener(organizacionId, id);
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }

  /** Elimina un cliente de la organización. */
  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.cliente.delete({ where: { id } });
    return { eliminado: true };
  }
}
