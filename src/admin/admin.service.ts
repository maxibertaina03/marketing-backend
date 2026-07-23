import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanSuscripcion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { planEfectivo } from '../planes/plan-efectivo';
import { limitesDe, periodoActual } from '../planes/limites';
import { CambiarPlanDto } from './dto/cambiar-plan.dto';
import { AjustarLimitesDto } from './dto/ajustar-limites.dto';

/**
 * Lógica del portal de superadministración. **Rompe el aislamiento multi-tenant
 * a propósito**: ve y toca todas las organizaciones. Por eso vive en su propio
 * módulo, detrás del `GuardSuperadmin`, y toda acción que cambia algo queda
 * registrada en `AuditoriaAdmin`.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todas las agencias con lo necesario para administrarlas de un vistazo. */
  async listarAgencias() {
    const periodo = periodoActual();
    const organizaciones = await this.prisma.organizacion.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: { select: { clientes: true, membresias: true } },
        consumosIa: { where: { periodo }, select: { generaciones: true, costoUsd: true } },
      },
    });

    return organizaciones.map((o) => {
      const plan = planEfectivo(o);
      const consumo = o.consumosIa[0];
      return {
        id: o.id,
        nombre: o.nombre,
        plan,
        planContratado: o.plan,
        planExpiraEn: o.planExpiraEn,
        suspendida: o.suspendida,
        marcas: o._count.clientes,
        usuarios: o._count.membresias,
        limites: limitesDe(o),
        consumoIaMes: consumo?.generaciones ?? 0,
        costoIaMes: consumo ? Number(consumo.costoUsd) : 0,
        creadoEn: o.creadoEn,
      };
    });
  }

  /** Consumo de IA de toda la plataforma en el período actual. */
  async consumoTotal() {
    const periodo = periodoActual();
    const consumos = await this.prisma.consumoIa.findMany({ where: { periodo } });
    return {
      periodo,
      agenciasActivas: consumos.length,
      generaciones: consumos.reduce((t, c) => t + c.generaciones, 0),
      costoUsd: consumos.reduce((t, c) => t + Number(c.costoUsd), 0),
    };
  }

  async cambiarPlan(superadmin: string, organizacionId: string, dto: CambiarPlanDto) {
    const antes = await this.exigirOrganizacion(organizacionId);
    const data: Prisma.OrganizacionUpdateInput = { plan: dto.plan };
    // Al salir de PRUEBA, se limpia el vencimiento; si se pone en PRUEBA, se fija.
    if (dto.plan === PlanSuscripcion.PRUEBA) {
      data.planExpiraEn = dto.expiraEn ? new Date(dto.expiraEn) : null;
    } else {
      data.planExpiraEn = null;
    }
    const despues = await this.prisma.organizacion.update({ where: { id: organizacionId }, data });
    await this.auditar(superadmin, 'CAMBIAR_PLAN', organizacionId, {
      de: antes.plan,
      a: despues.plan,
    });
    return despues;
  }

  async ajustarLimites(superadmin: string, organizacionId: string, dto: AjustarLimitesDto) {
    await this.exigirOrganizacion(organizacionId);
    // `null` explícito borra el override (vuelve al límite del plan); `undefined`
    // (campo ausente) lo deja como está.
    const data: Prisma.OrganizacionUpdateInput = {};
    if (dto.limiteMarcas !== undefined) data.limiteMarcas = dto.limiteMarcas;
    if (dto.limiteUsuariosInternos !== undefined)
      data.limiteUsuariosInternos = dto.limiteUsuariosInternos;
    if (dto.limiteGeneracionesIa !== undefined)
      data.limiteGeneracionesIa = dto.limiteGeneracionesIa;
    if (dto.limiteIaPorUsuario !== undefined) data.limiteIaPorUsuario = dto.limiteIaPorUsuario;

    const despues = await this.prisma.organizacion.update({ where: { id: organizacionId }, data });
    await this.auditar(superadmin, 'AJUSTAR_LIMITES', organizacionId, dto as Prisma.InputJsonValue);
    return despues;
  }

  /** Reinicia la cuota de IA del mes en curso: pone el contador en cero. */
  async reiniciarCuota(superadmin: string, organizacionId: string) {
    await this.exigirOrganizacion(organizacionId);
    const periodo = periodoActual();
    await this.prisma.consumoIa.updateMany({
      where: { organizacionId, periodo },
      data: { generaciones: 0, avisadoEn: null },
    });
    await this.auditar(superadmin, 'REINICIAR_CUOTA', organizacionId, { periodo });
    return { reiniciada: true, periodo };
  }

  async suspender(superadmin: string, organizacionId: string, suspender: boolean) {
    await this.exigirOrganizacion(organizacionId);
    await this.prisma.organizacion.update({
      where: { id: organizacionId },
      data: { suspendida: suspender },
    });
    await this.auditar(superadmin, suspender ? 'SUSPENDER' : 'REACTIVAR', organizacionId, null);
    return { suspendida: suspender };
  }

  /** Últimas acciones registradas del portal (para revisar quién tocó qué). */
  async auditoria(limite = 50) {
    return this.prisma.auditoriaAdmin.findMany({
      orderBy: { creadoEn: 'desc' },
      take: limite,
    });
  }

  private async exigirOrganizacion(id: string) {
    const organizacion = await this.prisma.organizacion.findUnique({ where: { id } });
    if (!organizacion) throw new NotFoundException('La organización no existe.');
    return organizacion;
  }

  private auditar(
    superadmin: string,
    accion: string,
    organizacionId: string,
    detalle: Prisma.InputJsonValue | null,
  ) {
    return this.prisma.auditoriaAdmin.create({
      data: { superadmin, accion, organizacionId, detalle: detalle ?? Prisma.JsonNull },
    });
  }
}
