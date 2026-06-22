import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Canal, EstadoContenido } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ActualizarPublicacionDto } from './dto/actualizar-publicacion.dto';

/** Relaciones que se devuelven con cada publicación: su cliente y (si tiene) su estrategia. */
const RELACIONES_PUBLICACION = {
  cliente: { select: { id: true, nombre: true } },
  estrategia: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class ContenidoService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(organizacionId: string, dto: CrearPublicacionDto) {
    await this.verificarClienteEnOrg(dto.clienteId, organizacionId);
    if (dto.estrategiaId) {
      await this.verificarEstrategiaDelCliente(dto.estrategiaId, dto.clienteId, organizacionId);
    }
    return this.prisma.publicacion.create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        canal: dto.canal,
        estado: dto.estado ?? EstadoContenido.BORRADOR,
        fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : null,
        imagenUrl: dto.imagenUrl,
        clienteId: dto.clienteId,
        estrategiaId: dto.estrategiaId ?? null,
        organizacionId,
      },
      include: RELACIONES_PUBLICACION,
    });
  }

  async listar(
    organizacionId: string,
    filtros: {
      clienteId?: string;
      estrategiaId?: string;
      canal?: Canal;
      estado?: EstadoContenido;
      desde?: string;
      hasta?: string;
    },
  ) {
    const { clienteId, estrategiaId, canal, estado, desde, hasta } = filtros;
    return this.prisma.publicacion.findMany({
      where: {
        organizacionId,
        ...(clienteId ? { clienteId } : {}),
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
      include: RELACIONES_PUBLICACION,
      orderBy: [{ fechaProgramada: 'asc' }, { creadoEn: 'desc' }],
    });
  }

  async obtener(organizacionId: string, id: string) {
    const publicacion = await this.prisma.publicacion.findFirst({
      where: { id, organizacionId },
      include: RELACIONES_PUBLICACION,
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
      include: RELACIONES_PUBLICACION,
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

  private async verificarClienteEnOrg(clienteId: string, organizacionId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
    });
    if (!cliente) throw new ForbiddenException('El cliente no pertenece a esta organización.');
  }

  /** La estrategia (si se indicó) debe existir en la org y pertenecer a ese cliente. */
  private async verificarEstrategiaDelCliente(
    estrategiaId: string,
    clienteId: string,
    organizacionId: string,
  ) {
    const estrategia = await this.prisma.estrategiaDeMarca.findFirst({
      where: { id: estrategiaId, organizacionId },
    });
    if (!estrategia)
      throw new ForbiddenException('La estrategia no pertenece a esta organización.');
    if (estrategia.clienteId !== clienteId)
      throw new ForbiddenException('La estrategia no pertenece a ese cliente.');
  }
}
