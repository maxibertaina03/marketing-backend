import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvisoPropuesto } from './tipos';

/** A quién le llega un aviso si la regla no aclara nada: a los que gestionan. */
const ROLES_POR_DEFECTO: Rol[] = [Rol.ADMIN, Rol.COMMUNITY_MANAGER];

/** Cuántos avisos devuelve el panel de la campanita. */
const LIMITE_PANEL = 30;

/**
 * Centro de notificaciones. Resuelve destinatarios, evita duplicados y expone el
 * panel de la campanita.
 *
 * Los avisos entran por dos puertas —evento y regla del job diario— pero ambas
 * terminan acá, en `emitir`, con la misma forma (`AvisoPropuesto`).
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Entrega un aviso a quien corresponda dentro de una organización.
   *
   * Si el destinatario ya tiene uno **sin leer** con la misma `clave`, lo actualiza
   * en lugar de crear otro: así el job diario puede correr todos los días sin
   * llenar el panel de repetidos.
   *
   * Devuelve cuántos avisos se crearon y cuántos se refrescaron.
   */
  async emitir(organizacionId: string, aviso: AvisoPropuesto) {
    const membresiaIds = await this.resolverDestinatarios(organizacionId, aviso);
    let creados = 0;
    let actualizados = 0;

    for (const membresiaId of membresiaIds) {
      const vigente = await this.prisma.notificacion.findFirst({
        where: { membresiaId, clave: aviso.clave, leida: false },
        select: { id: true },
      });

      if (vigente) {
        await this.prisma.notificacion.update({
          where: { id: vigente.id },
          data: { titulo: aviso.titulo, cuerpo: aviso.cuerpo, enlace: aviso.enlace },
        });
        actualizados++;
        continue;
      }

      await this.prisma.notificacion.create({
        data: {
          organizacionId,
          membresiaId,
          tipo: aviso.tipo,
          clave: aviso.clave,
          titulo: aviso.titulo,
          cuerpo: aviso.cuerpo,
          enlace: aviso.enlace,
        },
      });
      creados++;
    }

    return { creados, actualizados };
  }

  /** Emite varios avisos de una organización. Atajo para el motor de reglas. */
  async emitirVarios(organizacionId: string, avisos: AvisoPropuesto[]) {
    let creados = 0;
    let actualizados = 0;
    for (const aviso of avisos) {
      const r = await this.emitir(organizacionId, aviso);
      creados += r.creados;
      actualizados += r.actualizados;
    }
    return { creados, actualizados };
  }

  /**
   * Avisos del usuario en la organización activa: primero los no leídos, después
   * los leídos, y dentro de cada grupo los más nuevos arriba.
   */
  async listar(organizacionId: string, usuarioId: string) {
    const membresia = await this.membresiaDe(organizacionId, usuarioId);
    if (!membresia) return { notificaciones: [], sinLeer: 0 };

    const [notificaciones, sinLeer] = await Promise.all([
      this.prisma.notificacion.findMany({
        where: { membresiaId: membresia.id },
        orderBy: [{ leida: 'asc' }, { creadoEn: 'desc' }],
        take: LIMITE_PANEL,
      }),
      this.prisma.notificacion.count({ where: { membresiaId: membresia.id, leida: false } }),
    ]);

    return { notificaciones, sinLeer };
  }

  /** Solo el contador, para el globito de la campanita (se consulta seguido). */
  async contarSinLeer(organizacionId: string, usuarioId: string) {
    const membresia = await this.membresiaDe(organizacionId, usuarioId);
    if (!membresia) return { sinLeer: 0 };
    const sinLeer = await this.prisma.notificacion.count({
      where: { membresiaId: membresia.id, leida: false },
    });
    return { sinLeer };
  }

  /** Marca un aviso como leído. Solo puede hacerlo su destinatario. */
  async marcarLeida(organizacionId: string, usuarioId: string, notificacionId: string) {
    const membresia = await this.membresiaDe(organizacionId, usuarioId);
    const notificacion = membresia
      ? await this.prisma.notificacion.findFirst({
          where: { id: notificacionId, membresiaId: membresia.id },
        })
      : null;
    if (!notificacion) throw new NotFoundException('Notificación no encontrada.');

    if (notificacion.leida) return notificacion;
    return this.prisma.notificacion.update({
      where: { id: notificacion.id },
      data: { leida: true, leidaEn: new Date() },
    });
  }

  /** Marca todas las del usuario como leídas. */
  async marcarTodasLeidas(organizacionId: string, usuarioId: string) {
    const membresia = await this.membresiaDe(organizacionId, usuarioId);
    if (!membresia) return { marcadas: 0 };
    const { count } = await this.prisma.notificacion.updateMany({
      where: { membresiaId: membresia.id, leida: false },
      data: { leida: true, leidaEn: new Date() },
    });
    return { marcadas: count };
  }

  /** Membresía del usuario en la organización activa (o null si no pertenece). */
  private membresiaDe(organizacionId: string, usuarioId: string) {
    return this.prisma.membresia.findFirst({
      where: { organizacionId, usuarioId },
      select: { id: true },
    });
  }

  /** Traduce `paraMembresiaIds` / `paraRoles` a membresías concretas de la organización. */
  private async resolverDestinatarios(
    organizacionId: string,
    aviso: AvisoPropuesto,
  ): Promise<string[]> {
    if (aviso.paraMembresiaIds?.length) {
      // Se validan contra la organización: un aviso nunca cruza de tenant.
      const membresias = await this.prisma.membresia.findMany({
        where: { organizacionId, id: { in: aviso.paraMembresiaIds } },
        select: { id: true },
      });
      if (membresias.length !== aviso.paraMembresiaIds.length) {
        this.logger.warn(
          `La regla "${aviso.clave}" pidió membresías que no son de la organización ${organizacionId}.`,
        );
      }
      return membresias.map((m) => m.id);
    }

    const roles = aviso.paraRoles?.length ? aviso.paraRoles : ROLES_POR_DEFECTO;
    const membresias = await this.prisma.membresia.findMany({
      where: { organizacionId, rol: { in: roles } },
      select: { id: true },
    });
    return membresias.map((m) => m.id);
  }
}
