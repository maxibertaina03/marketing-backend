import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoPago, PlanSuscripcion, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PRECIO_MENSUAL, esPlanPagable } from '../planes/precios-plan';
import { ClienteMercadoPago } from './cliente-mercadopago';

const NOMBRE_PLAN: Record<string, string> = {
  STARTER: 'Starter',
  AGENCY: 'Agency',
  AGENCY_PRO: 'Agency Pro',
};

/**
 * Cobro de suscripciones con Mercado Pago (Checkout Pro).
 *
 * Flujo: el ADMIN inicia el checkout → se crea una fila `Pago` PENDIENTE y una
 * preferencia en MP → se lo manda a pagar → MP avisa por webhook → se verifica
 * el pago contra MP y, si está aprobado, se activa el plan de la organización.
 *
 * La confirmación **nunca** se cree por lo que dice el navegador al volver: solo
 * el webhook verificado contra MP activa el plan. Así nadie se regala un plan
 * llamando la URL de retorno a mano.
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  private readonly cliente: ClienteMercadoPago | null;
  private readonly moneda: string;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const token = config.get<string>('MERCADOPAGO_ACCESS_TOKEN') ?? '';
    this.cliente = token ? new ClienteMercadoPago(token) : null;
    this.moneda = config.get<string>('MONEDA_PAGO') ?? 'ARS';
    this.frontendUrl = config.get<string>('ORIGEN_FRONTEND') ?? '';
    this.backendUrl = config.get<string>('URL_BACKEND') ?? '';
  }

  /** Inicia el checkout de un plan y devuelve la URL de Mercado Pago. */
  async iniciarCheckout(organizacionId: string, plan: PlanSuscripcion) {
    const cliente = this.exigirCliente();
    if (!esPlanPagable(plan)) {
      throw new BadRequestException('Ese plan no se paga online (probá Starter, Agency o Pro).');
    }
    const monto = PRECIO_MENSUAL[plan]!;
    const referencia = randomUUID();

    await this.prisma.pago.create({
      data: {
        organizacionId,
        plan,
        monto: new Prisma.Decimal(monto),
        moneda: this.moneda,
        referencia,
        estado: EstadoPago.PENDIENTE,
      },
    });

    const { urlCheckout } = await cliente.crearPreferencia({
      titulo: `ContentOS — Plan ${NOMBRE_PLAN[plan]} (1 mes)`,
      monto,
      moneda: this.moneda,
      referencia,
      urlRetorno: `${this.frontendUrl}/planes?pago=listo`,
      urlWebhook: `${this.backendUrl}/api/pagos/webhook`,
    });

    return { urlCheckout };
  }

  /**
   * Procesa una notificación de Mercado Pago. Solo actúa sobre pagos `payment`;
   * verifica el estado consultando a MP (no confía en el cuerpo del webhook) y,
   * si está aprobado, activa el plan. Es idempotente: si el pago ya se procesó,
   * no vuelve a activar.
   */
  async procesarWebhook(tipo: string | undefined, dataId: string | undefined) {
    if (tipo !== 'payment' || !dataId) return { procesado: false };
    const cliente = this.exigirCliente();

    const pagoMp = await cliente.obtenerPago(dataId);
    const pago = await this.prisma.pago.findUnique({
      where: { referencia: pagoMp.external_reference },
    });
    if (!pago) {
      // Un pago que no corresponde a ninguna fila nuestra: se ignora en silencio.
      this.logger.warn(`Webhook de MP sin fila local: ref=${pagoMp.external_reference}`);
      return { procesado: false };
    }
    if (pago.estado === EstadoPago.APROBADO) return { procesado: true }; // ya estaba

    if (pagoMp.status === 'approved') {
      await this.prisma.$transaction([
        this.prisma.pago.update({
          where: { id: pago.id },
          data: { estado: EstadoPago.APROBADO, mpPagoId: String(pagoMp.id) },
        }),
        // Activa el plan: sale de prueba, y si estaba suspendida por falta de pago, revive.
        this.prisma.organizacion.update({
          where: { id: pago.organizacionId },
          data: { plan: pago.plan, planExpiraEn: null, suspendida: false },
        }),
      ]);
      this.logger.log(`Pago aprobado: org ${pago.organizacionId} → plan ${pago.plan}`);
      return { procesado: true };
    }

    if (pagoMp.status === 'rejected') {
      await this.prisma.pago.update({
        where: { id: pago.id },
        data: { estado: EstadoPago.RECHAZADO, mpPagoId: String(pagoMp.id) },
      });
    }
    return { procesado: true };
  }

  /** Historial de pagos de la organización (para la página de planes). */
  async historial(organizacionId: string) {
    return this.prisma.pago.findMany({
      where: { organizacionId },
      orderBy: { creadoEn: 'desc' },
      take: 20,
      select: { id: true, plan: true, monto: true, moneda: true, estado: true, creadoEn: true },
    });
  }

  private exigirCliente(): ClienteMercadoPago {
    if (!this.cliente) {
      throw new ServiceUnavailableException(
        'Los pagos no están configurados: falta MERCADOPAGO_ACCESS_TOKEN.',
      );
    }
    return this.cliente;
  }
}
