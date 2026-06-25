import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoTarea, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearTareaDto } from './dto/crear-tarea.dto';
import { ActualizarTareaDto } from './dto/actualizar-tarea.dto';
import { FiltrarTareasDto } from './dto/filtrar-tareas.dto';

/** Datos del responsable que se devuelven junto a cada tarea. */
const INCLUDE_TAREA = {
  asignado: {
    select: {
      id: true,
      rol: true,
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  },
  publicacion: { select: { id: true, titulo: true, estado: true } },
} satisfies Prisma.TareaInclude;

/**
 * Producción (Fase 2, slice de masita). Gestiona las tareas que el equipo realiza
 * sobre cada publicación. Toda operación queda acotada a la organización activa.
 */
@Injectable()
export class ProduccionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una tarea sobre una publicación de la organización. */
  async crear(organizacionId: string, dto: CrearTareaDto) {
    await this.verificarPublicacion(organizacionId, dto.publicacionId);
    if (dto.asignadoId) {
      await this.verificarMembresia(organizacionId, dto.asignadoId);
    }

    return this.prisma.tarea.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        estado: dto.estado,
        fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null,
        publicacionId: dto.publicacionId,
        asignadoId: dto.asignadoId ?? null,
        organizacionId,
      },
      include: INCLUDE_TAREA,
    });
  }

  /** Lista las tareas de la organización con filtros opcionales. */
  async listar(organizacionId: string, filtros: FiltrarTareasDto) {
    return this.prisma.tarea.findMany({
      where: this.armarWhere(organizacionId, filtros),
      include: INCLUDE_TAREA,
      orderBy: [{ fechaLimite: { sort: 'asc', nulls: 'last' } }, { creadoEn: 'desc' }],
    });
  }

  /**
   * Tablero de producción: las tareas agrupadas por estado (todas las columnas
   * presentes, aunque estén vacías).
   */
  async tablero(organizacionId: string, filtros: FiltrarTareasDto) {
    const tareas = await this.listar(organizacionId, filtros);
    const columnas = Object.fromEntries(
      Object.values(EstadoTarea).map((estado) => [estado, [] as typeof tareas]),
    ) as Record<EstadoTarea, typeof tareas>;

    for (const tarea of tareas) {
      columnas[tarea.estado].push(tarea);
    }
    return columnas;
  }

  /** Devuelve una tarea de la organización o lanza 404. */
  async obtener(organizacionId: string, id: string) {
    const tarea = await this.prisma.tarea.findFirst({
      where: { id, organizacionId },
      include: INCLUDE_TAREA,
    });
    if (!tarea) {
      throw new NotFoundException('La tarea no existe en esta organización.');
    }
    return tarea;
  }

  /** Actualiza parcialmente una tarea (estado, responsable, datos…). */
  async actualizar(organizacionId: string, id: string, dto: ActualizarTareaDto) {
    await this.obtener(organizacionId, id);
    if (dto.asignadoId) {
      await this.verificarMembresia(organizacionId, dto.asignadoId);
    }

    return this.prisma.tarea.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        estado: dto.estado,
        ...(dto.asignadoId !== undefined ? { asignadoId: dto.asignadoId } : {}),
        ...(dto.fechaLimite !== undefined ? { fechaLimite: new Date(dto.fechaLimite) } : {}),
      },
      include: INCLUDE_TAREA,
    });
  }

  /** Elimina una tarea de la organización. */
  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.tarea.delete({ where: { id } });
    return { eliminado: true };
  }

  private armarWhere(organizacionId: string, filtros: FiltrarTareasDto): Prisma.TareaWhereInput {
    return {
      organizacionId,
      ...(filtros.publicacionId ? { publicacionId: filtros.publicacionId } : {}),
      ...(filtros.asignadoId ? { asignadoId: filtros.asignadoId } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
  }

  /** Verifica que la publicación exista y sea de la organización. */
  private async verificarPublicacion(organizacionId: string, publicacionId: string) {
    const publicacion = await this.prisma.publicacion.findFirst({
      where: { id: publicacionId, organizacionId },
      select: { id: true },
    });
    if (!publicacion) {
      throw new ForbiddenException('La publicación no pertenece a esta organización.');
    }
  }

  /** Verifica que la membresía a asignar exista y sea de la organización. */
  private async verificarMembresia(organizacionId: string, membresiaId: string) {
    const membresia = await this.prisma.membresia.findFirst({
      where: { id: membresiaId, organizacionId },
      select: { id: true },
    });
    if (!membresia) {
      throw new ForbiddenException('El responsable no pertenece a esta organización.');
    }
  }
}
