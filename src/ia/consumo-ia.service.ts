import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma, TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AVISO_CUOTA, limitesDe, periodoActual } from '../planes/limites';
import { planEfectivo } from '../planes/plan-efectivo';
import { costoUsd, type TokensUsados } from './precios';

/** Lo que se le devuelve al front cuando bloquea la cuota. */
export interface CuotaAgotada {
  codigo: 'CUOTA_IA_AGOTADA' | 'CUOTA_IA_USUARIO_AGOTADA';
  message: string;
  consumido: number;
  limite: number;
  periodo: string;
}

/**
 * Consumo y cuota de IA por organización.
 *
 * Se apoya en `ConsumoIa`, un acumulado por período: verificar la cuota antes de
 * cada generación es **una lectura por clave**, no una agregación sobre toda la
 * tabla de generaciones.
 */
@Injectable()
export class ConsumoIaService {
  private readonly logger = new Logger(ConsumoIaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Verifica que la organización (y opcionalmente la persona) tenga cuota antes
   * de gastar en la API. Lanza 403 con el detalle si no.
   *
   * Se llama **antes** de Anthropic: bloquear después sería pagar igual.
   */
  async verificar(organizacionId: string, usuarioId?: string): Promise<void> {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
      select: {
        plan: true,
        planExpiraEn: true,
        limiteMarcas: true,
        limiteUsuariosInternos: true,
        limiteGeneracionesIa: true,
        limiteIaPorUsuario: true,
      },
    });
    if (!organizacion) return; // sin organización no hay nada que limitar

    const limites = limitesDe({ ...organizacion, plan: planEfectivo(organizacion) });
    const periodo = periodoActual();

    if (limites.generacionesIaPorMes !== null) {
      const consumo = await this.prisma.consumoIa.findUnique({
        where: { organizacionId_periodo: { organizacionId, periodo } },
        select: { generaciones: true },
      });
      const usadas = consumo?.generaciones ?? 0;
      if (usadas >= limites.generacionesIaPorMes) {
        throw new ForbiddenException({
          codigo: 'CUOTA_IA_AGOTADA',
          message:
            `La agencia agotó su cuota de IA del mes (${usadas} de ${limites.generacionesIaPorMes} ` +
            'generaciones). Mejorá el plan para seguir generando.',
          consumido: usadas,
          limite: limites.generacionesIaPorMes,
          periodo,
        } satisfies CuotaAgotada);
      }
    }

    // Sub-límite por persona: se cuenta sobre las generaciones del mes, que es
    // consulta indexada y solo corre si la agencia configuró un tope.
    if (organizacion.limiteIaPorUsuario !== null && usuarioId) {
      const desde = new Date(`${periodo}-01T00:00:00.000Z`);
      const propias = await this.prisma.generacionIa.count({
        where: { organizacionId, usuarioId, creadoEn: { gte: desde } },
      });
      if (propias >= organizacion.limiteIaPorUsuario) {
        throw new ForbiddenException({
          codigo: 'CUOTA_IA_USUARIO_AGOTADA',
          message:
            `Alcanzaste tu límite personal de IA del mes (${propias} de ` +
            `${organizacion.limiteIaPorUsuario} generaciones). Pedile a quien administra la ` +
            'agencia que lo amplíe.',
          consumido: propias,
          limite: organizacion.limiteIaPorUsuario,
          periodo,
        } satisfies CuotaAgotada);
      }
    }
  }

  /**
   * Suma una generación al acumulado del período. Se llama después de que la
   * API respondió, con los tokens reales.
   */
  async registrar(organizacionId: string, modelo: string, tokens: TokensUsados): Promise<void> {
    const periodo = periodoActual();
    const costo = new Prisma.Decimal(costoUsd(tokens, modelo));

    const consumo = await this.prisma.consumoIa.upsert({
      where: { organizacionId_periodo: { organizacionId, periodo } },
      create: {
        organizacionId,
        periodo,
        generaciones: 1,
        tokensEntrada: tokens.entrada,
        tokensSalida: tokens.salida,
        tokensCacheEscritura: tokens.cacheEscritura,
        tokensCacheLectura: tokens.cacheLectura,
        costoUsd: costo,
      },
      update: {
        generaciones: { increment: 1 },
        tokensEntrada: { increment: tokens.entrada },
        tokensSalida: { increment: tokens.salida },
        tokensCacheEscritura: { increment: tokens.cacheEscritura },
        tokensCacheLectura: { increment: tokens.cacheLectura },
        costoUsd: { increment: costo },
      },
    });

    await this.avisarSiSeAgota(organizacionId, consumo.generaciones, consumo.avisadoEn, periodo);
  }

  /** Consumo del período actual, con límite y detalle por persona y por marca. */
  async resumen(organizacionId: string) {
    const organizacion = await this.prisma.organizacion.findUnique({
      where: { id: organizacionId },
      select: {
        plan: true,
        planExpiraEn: true,
        limiteMarcas: true,
        limiteUsuariosInternos: true,
        limiteGeneracionesIa: true,
        limiteIaPorUsuario: true,
      },
    });
    const periodo = periodoActual();
    const limites = organizacion
      ? limitesDe({ ...organizacion, plan: planEfectivo(organizacion) })
      : { marcas: null, usuariosInternos: null, generacionesIaPorMes: null };

    const consumo = await this.prisma.consumoIa.findUnique({
      where: { organizacionId_periodo: { organizacionId, periodo } },
    });

    const desde = new Date(`${periodo}-01T00:00:00.000Z`);
    const generaciones = await this.prisma.generacionIa.findMany({
      where: { organizacionId, creadoEn: { gte: desde } },
      select: { usuarioId: true, clienteId: true, tipoBoton: true },
    });

    // Nombres para mostrar, resueltos de una sola vez.
    const usuarioIds = [...new Set(generaciones.map((g) => g.usuarioId).filter(Boolean))];
    const clienteIds = [...new Set(generaciones.map((g) => g.clienteId).filter(Boolean))];
    const [usuarios, clientes] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { id: { in: usuarioIds as string[] } },
        select: { id: true, nombre: true, email: true },
      }),
      this.prisma.cliente.findMany({
        where: { id: { in: clienteIds as string[] }, organizacionId },
        select: { id: true, nombre: true },
      }),
    ]);

    return {
      periodo,
      plan: organizacion ? planEfectivo(organizacion) : null,
      generaciones: consumo?.generaciones ?? 0,
      limite: limites.generacionesIaPorMes,
      limitePorUsuario: organizacion?.limiteIaPorUsuario ?? null,
      costoUsd: consumo ? Number(consumo.costoUsd) : 0,
      tokens: {
        entrada: consumo?.tokensEntrada ?? 0,
        salida: consumo?.tokensSalida ?? 0,
        cacheEscritura: consumo?.tokensCacheEscritura ?? 0,
        cacheLectura: consumo?.tokensCacheLectura ?? 0,
      },
      porUsuario: this.agrupar(generaciones, 'usuarioId', (id) => {
        const u = usuarios.find((x) => x.id === id);
        return u?.nombre ?? u?.email ?? 'Sin identificar';
      }),
      porMarca: this.agrupar(generaciones, 'clienteId', (id) => {
        return clientes.find((x) => x.id === id)?.nombre ?? 'Sin marca';
      }),
      porBoton: this.agrupar(generaciones, 'tipoBoton', (v) => v),
    };
  }

  /** Avisa una sola vez por período cuando se cruza el umbral de la cuota. */
  private async avisarSiSeAgota(
    organizacionId: string,
    generaciones: number,
    avisadoEn: Date | null,
    periodo: string,
  ): Promise<void> {
    if (avisadoEn) return;

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
    if (!organizacion) return;

    const limite = limitesDe({
      ...organizacion,
      plan: planEfectivo(organizacion),
    }).generacionesIaPorMes;
    if (limite === null || generaciones < limite * AVISO_CUOTA) return;

    try {
      await this.notificaciones.emitir(organizacionId, {
        tipo: TipoNotificacion.CUOTA_IA_CERCA,
        clave: `cuota-ia-cerca:${periodo}`,
        titulo: `Usaste ${generaciones} de ${limite} generaciones de IA este mes.`,
        cuerpo: 'Cuando se agote, los botones de IA se bloquean hasta el mes que viene.',
        enlace: '/configuracion',
      });
      await this.prisma.consumoIa.update({
        where: { organizacionId_periodo: { organizacionId, periodo } },
        data: { avisadoEn: new Date() },
      });
    } catch (e) {
      // Que falle el aviso no puede tumbar una generación que ya se pagó.
      this.logger.warn(`No se pudo avisar la cuota de ${organizacionId}: ${String(e)}`);
    }
  }

  private agrupar<T, K extends keyof T>(
    filas: T[],
    campo: K,
    nombre: (valor: NonNullable<T[K]>) => string,
  ) {
    const conteo = new Map<string, number>();
    for (const fila of filas) {
      const valor = fila[campo];
      const clave = nombre((valor ?? '') as NonNullable<T[K]>);
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .map(([etiqueta, generaciones]) => ({ etiqueta, generaciones }))
      .sort((a, b) => b.generaciones - a.generaciones);
  }
}
