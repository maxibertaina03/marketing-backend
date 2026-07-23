import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { limitesDe } from './limites';
import { planEfectivo } from './plan-efectivo';

/** Forma del error 403 cuando se topa un límite del plan (la usa el front). */
export interface LimitePlanAlcanzado {
  codigo: 'LIMITE_MARCAS' | 'LIMITE_USUARIOS';
  message: string;
  limite: number;
}

/**
 * Aplica los límites del plan que no son la cuota de IA: cantidad de marcas y de
 * usuarios internos. La cuota de IA vive aparte, en `ConsumoIaService`, porque
 * necesita el acumulado por período; estos dos son un simple conteo.
 *
 * Los usuarios con rol CLIENTE **no cuentan**: son ilimitados en todos los planes.
 */
@Injectable()
export class PlanesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lanza 403 si crear una marca más supera el límite del plan. */
  async verificarPuedeCrearMarca(organizacionId: string): Promise<void> {
    const limites = await this.limites(organizacionId);
    if (limites.marcas === null) return; // sin tope (Enterprise)

    const marcas = await this.prisma.cliente.count({ where: { organizacionId } });
    if (marcas >= limites.marcas) {
      throw new ForbiddenException({
        codigo: 'LIMITE_MARCAS',
        message:
          `Tu plan permite ${limites.marcas} ${limites.marcas === 1 ? 'marca' : 'marcas'}. ` +
          'Mejoralo para agregar más.',
        limite: limites.marcas,
      } satisfies LimitePlanAlcanzado);
    }
  }

  /**
   * Lanza 403 si sumar un usuario interno más supera el límite del plan.
   * Solo aplica a roles internos; invitar un CLIENTE nunca se frena.
   */
  async verificarPuedeInvitarInterno(organizacionId: string, rol: Rol): Promise<void> {
    if (rol === Rol.CLIENTE) return;

    const limites = await this.limites(organizacionId);
    if (limites.usuariosInternos === null) return; // sin tope (Enterprise)

    // Cuenta lo que ya ocupa cupo: miembros internos + invitaciones internas
    // pendientes (una invitación reserva el lugar aunque no la hayan aceptado).
    const [miembros, invitaciones] = await Promise.all([
      this.prisma.membresia.count({
        where: { organizacionId, rol: { not: Rol.CLIENTE } },
      }),
      this.prisma.invitacion.count({
        where: { organizacionId, rol: { not: Rol.CLIENTE } },
      }),
    ]);

    if (miembros + invitaciones >= limites.usuariosInternos) {
      throw new ForbiddenException({
        codigo: 'LIMITE_USUARIOS',
        message:
          `Tu plan permite ${limites.usuariosInternos} ` +
          `${limites.usuariosInternos === 1 ? 'usuario interno' : 'usuarios internos'} ` +
          '(los clientes no cuentan). Mejoralo para sumar a tu equipo.',
        limite: limites.usuariosInternos,
      } satisfies LimitePlanAlcanzado);
    }
  }

  private async limites(organizacionId: string) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
      select: {
        plan: true,
        planExpiraEn: true,
        limiteMarcas: true,
        limiteUsuariosInternos: true,
        limiteGeneracionesIa: true,
      },
    });
    // Sin organización no hay límites que aplicar (el guard ya la habría rechazado).
    if (!organizacion) return { marcas: null, usuariosInternos: null, generacionesIaPorMes: null };
    return limitesDe({ ...organizacion, plan: planEfectivo(organizacion) });
  }
}
