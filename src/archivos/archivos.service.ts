import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearArchivoDto } from './dto/crear-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { FiltrarArchivosDto } from './dto/filtrar-archivos.dto';

/**
 * Gestión de Archivos (Fase 2, slice de masita). MVP: guarda metadata + URL al
 * hosting externo (Render free no tiene disco persistente). Multi-tenant.
 */
@Injectable()
export class ArchivosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra un archivo de una marca de la organización. */
  async crear(organizacionId: string, dto: CrearArchivoDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);
    if (dto.publicacionId) {
      await this.verificarPublicacion(organizacionId, dto.publicacionId);
    }

    return this.prisma.archivo.create({
      data: {
        nombre: dto.nombre,
        url: dto.url,
        tipo: dto.tipo,
        tamanoBytes: dto.tamanoBytes,
        clienteId: dto.clienteId,
        publicacionId: dto.publicacionId ?? null,
        organizacionId,
      },
    });
  }

  /** Lista los archivos de la organización con filtros opcionales. */
  async listar(organizacionId: string, filtros: FiltrarArchivosDto) {
    const where: Prisma.ArchivoWhereInput = {
      organizacionId,
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(filtros.publicacionId ? { publicacionId: filtros.publicacionId } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
    return this.prisma.archivo.findMany({ where, orderBy: { creadoEn: 'desc' } });
  }

  /** Devuelve un archivo de la organización o lanza 404. */
  async obtener(organizacionId: string, id: string) {
    const archivo = await this.prisma.archivo.findFirst({ where: { id, organizacionId } });
    if (!archivo) {
      throw new NotFoundException('El archivo no existe en esta organización.');
    }
    return archivo;
  }

  /** Actualiza parcialmente un archivo. */
  async actualizar(organizacionId: string, id: string, dto: ActualizarArchivoDto) {
    await this.obtener(organizacionId, id);
    if (dto.publicacionId) {
      await this.verificarPublicacion(organizacionId, dto.publicacionId);
    }

    return this.prisma.archivo.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        url: dto.url,
        tipo: dto.tipo,
        tamanoBytes: dto.tamanoBytes,
        ...(dto.publicacionId !== undefined ? { publicacionId: dto.publicacionId } : {}),
      },
    });
  }

  /** Elimina (desregistra) un archivo de la organización. */
  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.archivo.delete({ where: { id } });
    return { eliminado: true };
  }

  private async verificarCliente(organizacionId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
      select: { id: true },
    });
    if (!cliente) {
      throw new ForbiddenException('El cliente no pertenece a esta organización.');
    }
  }

  private async verificarPublicacion(organizacionId: string, publicacionId: string) {
    const publicacion = await this.prisma.publicacion.findFirst({
      where: { id: publicacionId, organizacionId },
      select: { id: true },
    });
    if (!publicacion) {
      throw new ForbiddenException('La publicación no pertenece a esta organización.');
    }
  }
}
