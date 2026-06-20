import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Canal, EstadoContenido } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ActualizarPublicacionDto } from './dto/actualizar-publicacion.dto';

@Injectable()
export class ContenidoService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(organizacionId: string, dto: CrearPublicacionDto) {
    await this.verificarEstrategiaEnOrg(dto.estrategiaId, organizacionId);
    return this.prisma.publicacion.create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        canal: dto.canal,
        estado: dto.estado ?? EstadoContenido.BORRADOR,
        fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : null,
        imagenUrl: dto.imagenUrl,
        estrategiaId: dto.estrategiaId,
        organizacionId,
      },
      include: {
        estrategia: { select: { id: true, nombre: true, clienteId: true } },
      },
    });
  }

  async listar(
    organizacionId: string,
    filtros: {
      estrategiaId?: string;
      canal?: Canal;
      estado?: EstadoContenido;
      desde?: string;
      hasta?: string;
    },
  ) {
    const { estrategiaId, canal, estado, desde, hasta } = filtros;
    return this.prisma.publicacion.findMany({
      where: {
        organizacionId,
        ...(estrategiaId ? { estrategiaId } : {}),
        ...(canal ? { canal } : {}),
        ...(estado ? { estado } : {}),
        ...(desde || hasta
          ? {
              fechaProgramada: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: {
        estrategia: {
          select: { id: true, nombre: true, cliente: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: [{ fechaProgramada: 'asc' }, { creadoEn: 'desc' }],
    });
  }

  async obtener(organizacionId: string, id: string) {
    const publicacion = await this.prisma.publicacion.findFirst({
      where: { id, organizacionId },
      include: {
        estrategia: {
          select: {
            id: true,
            nombre: true,
            tono: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!publicacion) throw new NotFoundException('Publicación no encontrada.');
    return publicacion;
  }

  async actualizar(organizacionId: string, id: string, dto: ActualizarPublicacionDto) {
    await this.obtener(organizacionId, id);
    return this.prisma.publicacion.update({
      where: { id },
      data: {
        ...dto,
        fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined,
      },
      include: {
        estrategia: { select: { id: true, nombre: true } },
      },
    });
  }

  async cambiarEstado(organizacionId: string, id: string, estado: EstadoContenido) {
    await this.obtener(organizacionId, id);
    return this.prisma.publicacion.update({
      where: { id },
      data: { estado },
    });
  }

  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.publicacion.delete({ where: { id } });
  }

  private async verificarEstrategiaEnOrg(estrategiaId: string, organizacionId: string) {
    const estrategia = await this.prisma.estrategiaDeMarca.findFirst({
      where: { id: estrategiaId, organizacionId },
    });
    if (!estrategia)
      throw new ForbiddenException('La estrategia no pertenece a esta organización.');
  }
}
