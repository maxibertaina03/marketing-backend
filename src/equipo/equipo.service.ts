import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitarMiembroDto } from './dto/invitar-miembro.dto';

/**
 * Gestión del equipo de una organización: miembros, roles e invitaciones.
 *
 * Invitar por email: si la persona ya tiene usuario, se la suma como miembro
 * directamente; si no, se guarda una Invitacion que se convierte en membresía
 * la primera vez que inicie sesión (ver GuardAutenticacion).
 */
@Injectable()
export class EquipoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista los miembros (usuario + rol) de la organización. */
  async listarMiembros(organizacionId: string) {
    const membresias = await this.prisma.membresia.findMany({
      where: { organizacionId },
      include: { usuario: true },
      orderBy: { creadoEn: 'asc' },
    });

    return membresias.map((m) => ({
      membresiaId: m.id,
      usuarioId: m.usuarioId,
      email: m.usuario.email,
      nombre: m.usuario.nombre,
      rol: m.rol,
    }));
  }

  /** Lista las invitaciones pendientes de la organización. */
  async listarInvitaciones(organizacionId: string) {
    return this.prisma.invitacion.findMany({
      where: { organizacionId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Invita a alguien por email. Devuelve si quedó como miembro (ya tenía usuario)
   * o como invitación pendiente.
   */
  async invitar(organizacionId: string, dto: InvitarMiembroDto) {
    const email = dto.email.toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const yaMiembro = await this.prisma.membresia.findUnique({
        where: { usuarioId_organizacionId: { usuarioId: usuario.id, organizacionId } },
      });
      if (yaMiembro) {
        throw new ConflictException('Esa persona ya es miembro de la organización.');
      }
      const membresia = await this.prisma.membresia.create({
        data: { usuarioId: usuario.id, organizacionId, rol: dto.rol },
      });
      return { tipo: 'membresia' as const, membresia };
    }

    const invitacion = await this.prisma.invitacion.upsert({
      where: { organizacionId_email: { organizacionId, email } },
      update: { rol: dto.rol },
      create: { organizacionId, email, rol: dto.rol },
    });
    return { tipo: 'invitacion' as const, invitacion };
  }

  /** Cancela una invitación pendiente de la organización. */
  async cancelarInvitacion(organizacionId: string, id: string) {
    const invitacion = await this.prisma.invitacion.findFirst({ where: { id, organizacionId } });
    if (!invitacion) {
      throw new NotFoundException('La invitación no existe en esta organización.');
    }
    await this.prisma.invitacion.delete({ where: { id } });
    return { cancelada: true };
  }

  /** Cambia el rol de un miembro (sin dejar la organización sin ADMIN). */
  async cambiarRol(organizacionId: string, membresiaId: string, rol: Rol) {
    const membresia = await this.obtenerMembresia(organizacionId, membresiaId);
    if (membresia.rol === Rol.ADMIN && rol !== Rol.ADMIN) {
      await this.asegurarNoEsUltimoAdmin(organizacionId);
    }
    return this.prisma.membresia.update({ where: { id: membresiaId }, data: { rol } });
  }

  /** Quita a un miembro de la organización (sin dejarla sin ADMIN). */
  async quitarMiembro(organizacionId: string, membresiaId: string) {
    const membresia = await this.obtenerMembresia(organizacionId, membresiaId);
    if (membresia.rol === Rol.ADMIN) {
      await this.asegurarNoEsUltimoAdmin(organizacionId);
    }
    await this.prisma.membresia.delete({ where: { id: membresiaId } });
    return { eliminado: true };
  }

  /** Busca una membresía de la organización o lanza 404. */
  private async obtenerMembresia(organizacionId: string, membresiaId: string) {
    const membresia = await this.prisma.membresia.findFirst({
      where: { id: membresiaId, organizacionId },
    });
    if (!membresia) {
      throw new NotFoundException('El miembro no existe en esta organización.');
    }
    return membresia;
  }

  /** Evita que la organización se quede sin ningún ADMIN. */
  private async asegurarNoEsUltimoAdmin(organizacionId: string) {
    const admins = await this.prisma.membresia.count({
      where: { organizacionId, rol: Rol.ADMIN },
    });
    if (admins <= 1) {
      throw new ConflictException('La organización debe tener al menos un ADMIN.');
    }
  }
}
