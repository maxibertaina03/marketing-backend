import { Injectable, NotFoundException } from '@nestjs/common';
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
      include: { organizacion: true },
      orderBy: { creadoEn: 'asc' },
    });

    return membresias.map((m) => ({
      organizacionId: m.organizacionId,
      nombre: m.organizacion.nombre,
      rol: m.rol,
      // El front decide con esto qué secciones muestra (igual que con el rol).
      plan: planEfectivo(m.organizacion),
      planExpiraEn: m.organizacion.planExpiraEn,
    }));
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
