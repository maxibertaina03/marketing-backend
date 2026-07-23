import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearOrganizacionDto } from './dto/crear-organizacion.dto';
import { planEfectivo } from '../planes/plan-efectivo';

@Injectable()
export class OrganizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una organización y, en la misma transacción, una membresía ADMIN
   * para el usuario que la creó.
   */
  async crear(usuarioId: string, dto: CrearOrganizacionDto) {
    return this.prisma.organizacion.create({
      data: {
        nombre: dto.nombre,
        membresias: {
          create: { usuarioId, rol: Rol.ADMIN },
        },
      },
      include: { membresias: true },
    });
  }

  /** Lista las organizaciones a las que pertenece el usuario, con su rol. */
  async listarMias(usuarioId: string) {
    const membresias = await this.prisma.membresia.findMany({
      where: { usuarioId },
      include: {
        organizacion: {
          include: { _count: { select: { clientes: true, membresias: true } } },
        },
      },
      orderBy: { creadoEn: 'asc' },
    });

    return membresias.map((m) => ({
      organizacionId: m.organizacionId,
      nombre: m.organizacion.nombre,
      rol: m.rol,
      // El front decide con esto qué secciones muestra (igual que con el rol).
      plan: planEfectivo(m.organizacion),
      planExpiraEn: m.organizacion.planExpiraEn,
      // Para ofrecer salir/eliminar: una agencia sin marcas es "vacía".
      vacia: m.organizacion._count.clientes === 0,
      soyUnicoMiembro: m.organizacion._count.membresias === 1,
    }));
  }

  /**
   * Saca al usuario de una organización.
   *
   * Distingue dos casos según lo que quede detrás:
   *  - **Abandonar**: si quedan otros miembros, borra solo la membresía del usuario.
   *  - **Eliminar**: si el usuario era el único miembro, borra la organización
   *    entera (cascade limpia lo que colgaba de ella).
   *
   * Reglas que protegen los datos y el acceso:
   *  - Solo un ADMIN puede hacerlo.
   *  - Si la organización tiene marcas, no se toca: primero hay que sacarlas
   *    (evita borrar trabajo real por accidente — la idea es limpiar las vacías).
   *  - No se puede dejar una organización con miembros pero sin ningún ADMIN.
   */
  async salir(organizacionId: string, usuarioId: string) {
    const membresia = await this.prisma.membresia.findFirst({
      where: { organizacionId, usuarioId },
    });
    if (!membresia) {
      throw new NotFoundException('No pertenecés a esta organización.');
    }
    if (membresia.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo un administrador puede eliminar o abandonar la agencia.');
    }

    const marcas = await this.prisma.cliente.count({ where: { organizacionId } });
    if (marcas > 0) {
      throw new ConflictException(
        'La agencia todavía tiene marcas. Eliminalas primero para poder salir.',
      );
    }

    const otrosMiembros = await this.prisma.membresia.count({
      where: { organizacionId, usuarioId: { not: usuarioId } },
    });

    // Único miembro → la agencia queda sin nadie: se elimina entera.
    if (otrosMiembros === 0) {
      await this.prisma.organizacion.delete({ where: { id: organizacionId } });
      return { accion: 'eliminada' as const };
    }

    // Quedan otros: no dejar la agencia sin ningún ADMIN.
    const otrosAdmins = await this.prisma.membresia.count({
      where: { organizacionId, usuarioId: { not: usuarioId }, rol: Rol.ADMIN },
    });
    if (otrosAdmins === 0) {
      throw new ConflictException(
        'Sos el único administrador. Nombrá a otro antes de abandonar la agencia.',
      );
    }

    await this.prisma.membresia.delete({ where: { id: membresia.id } });
    return { accion: 'abandonada' as const };
  }

  /** Devuelve los datos de una organización (debe existir). */
  async obtener(organizacionId: string) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
    });
    if (!organizacion) {
      throw new NotFoundException('La organización no existe.');
    }
    // `plan` es el contratado; el efectivo puede diferir si venció la prueba.
    return { ...organizacion, plan: planEfectivo(organizacion) };
  }
}
