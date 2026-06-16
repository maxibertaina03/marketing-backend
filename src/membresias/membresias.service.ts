import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembresiasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista los miembros (usuarios + rol) de una organización. */
  async listarPorOrganizacion(organizacionId: string) {
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
}
