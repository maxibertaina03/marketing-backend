import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoContenido } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FiltrarPortalDto } from './dto/filtrar-portal.dto';

// Estados que el cliente puede ver (excluye BORRADOR — trabajo en progreso interno).
const ESTADOS_VISIBLES: EstadoContenido[] = [
  EstadoContenido.EN_REVISION,
  EstadoContenido.APROBADO,
  EstadoContenido.RECHAZADO,
  EstadoContenido.PROGRAMADO,
  EstadoContenido.PUBLICADO,
];

@Injectable()
export class PortalClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPublicaciones(organizacionId: string, clienteId: string, filtros: FiltrarPortalDto) {
    const { estado, pagina = 1, limite = 20 } = filtros;
    const skip = (pagina - 1) * limite;

    const estadosFiltro = estado && ESTADOS_VISIBLES.includes(estado)
      ? [estado]
      : ESTADOS_VISIBLES;

    const where = { organizacionId, clienteId, estado: { in: estadosFiltro } };

    const [total, items] = await Promise.all([
      this.prisma.publicacion.count({ where }),
      this.prisma.publicacion.findMany({
        where,
        skip,
        take: limite,
        orderBy: { actualizadoEn: 'desc' },
        select: {
          id: true,
          titulo: true,
          canal: true,
          estado: true,
          motivoRechazo: true,
          imagenUrl: true,
          fechaProgramada: true,
          creadoEn: true,
          actualizadoEn: true,
          cliente: { select: { id: true, nombre: true, logoUrl: true } },
        },
      }),
    ]);

    return { total, pagina, limite, items };
  }

  async obtenerPublicacion(organizacionId: string, clienteId: string, id: string) {
    const pub = await this.prisma.publicacion.findFirst({
      where: { id, organizacionId },
      include: { cliente: { select: { id: true, nombre: true, logoUrl: true } } },
    });

    if (!pub) throw new NotFoundException('Publicación no encontrada.');

    // El CLIENTE solo puede ver publicaciones de su propia marca.
    if (pub.clienteId !== clienteId) {
      throw new ForbiddenException('No tenés acceso a publicaciones de esta marca.');
    }

    // Tampoco puede ver borradores.
    if (!ESTADOS_VISIBLES.includes(pub.estado)) {
      throw new ForbiddenException('Esta publicación no está disponible para revisión.');
    }

    return pub;
  }
}
