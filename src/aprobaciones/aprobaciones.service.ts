import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoContenido, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FiltrarAprobacionesDto } from './dto/filtrar-aprobaciones.dto';
import { AprobarDto } from './dto/aprobar.dto';
import { RechazarDto } from './dto/rechazar.dto';

interface ContextoUsuario {
  organizacionId: string;
  membresiaId: string;
  rol: Rol;
  clienteId?: string | null;
}

@Injectable()
export class AprobacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(organizacionId: string, filtros: FiltrarAprobacionesDto) {
    const { clienteId, pagina = 1, limite = 20 } = filtros;
    const skip = (pagina - 1) * limite;

    const where = {
      organizacionId,
      estado: EstadoContenido.EN_REVISION,
      ...(clienteId ? { clienteId } : {}),
    };

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
          fechaProgramada: true,
          creadoEn: true,
          actualizadoEn: true,
          cliente: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    return { total, pagina, limite, items };
  }

  async obtener(organizacionId: string, id: string, ctx: ContextoUsuario) {
    const pub = await this.prisma.publicacion.findFirst({
      where: { id, organizacionId },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    if (!pub) throw new NotFoundException('Publicación no encontrada.');
    this.validarAccesoCliente(pub.clienteId, ctx);
    return pub;
  }

  async enviarRevision(organizacionId: string, id: string) {
    const pub = await this.prisma.publicacion.findFirst({ where: { id, organizacionId } });
    if (!pub) throw new NotFoundException('Publicación no encontrada.');
    if (pub.estado !== EstadoContenido.BORRADOR && pub.estado !== EstadoContenido.RECHAZADO) {
      throw new ConflictException(
        `No se puede enviar a revisión desde el estado '${pub.estado}'.`,
      );
    }
    return this.prisma.publicacion.update({
      where: { id },
      data: { estado: EstadoContenido.EN_REVISION, motivoRechazo: null },
      select: { id: true, titulo: true, estado: true, motivoRechazo: true, actualizadoEn: true },
    });
  }

  async aprobar(organizacionId: string, id: string, dto: AprobarDto, ctx: ContextoUsuario) {
    const pub = await this.prisma.publicacion.findFirst({ where: { id, organizacionId } });
    if (!pub) throw new NotFoundException('Publicación no encontrada.');
    this.validarAccesoCliente(pub.clienteId, ctx);
    if (pub.estado !== EstadoContenido.EN_REVISION) {
      throw new ConflictException(
        `Solo se puede aprobar una publicación EN_REVISION. Estado actual: '${pub.estado}'.`,
      );
    }
    return this.prisma.publicacion.update({
      where: { id },
      data: { estado: EstadoContenido.APROBADO, motivoRechazo: null },
      select: { id: true, titulo: true, estado: true, motivoRechazo: true, actualizadoEn: true },
    });
  }

  async rechazar(organizacionId: string, id: string, dto: RechazarDto, ctx: ContextoUsuario) {
    const pub = await this.prisma.publicacion.findFirst({ where: { id, organizacionId } });
    if (!pub) throw new NotFoundException('Publicación no encontrada.');
    this.validarAccesoCliente(pub.clienteId, ctx);
    if (pub.estado !== EstadoContenido.EN_REVISION) {
      throw new ConflictException(
        `Solo se puede rechazar una publicación EN_REVISION. Estado actual: '${pub.estado}'.`,
      );
    }
    return this.prisma.publicacion.update({
      where: { id },
      data: { estado: EstadoContenido.RECHAZADO, motivoRechazo: dto.motivo },
      select: { id: true, titulo: true, estado: true, motivoRechazo: true, actualizadoEn: true },
    });
  }

  private validarAccesoCliente(publicacionClienteId: string, ctx: ContextoUsuario) {
    if (ctx.rol !== Rol.CLIENTE) return;
    if (!ctx.clienteId || ctx.clienteId !== publicacionClienteId) {
      throw new ForbiddenException('No tenés acceso a publicaciones de esta marca.');
    }
  }
}
