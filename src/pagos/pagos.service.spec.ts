import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { EstadoPago, PlanSuscripcion } from '@prisma/client';
import { PagosService } from './pagos.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import { ClienteMercadoPago } from './cliente-mercadopago';

const CONFIG = (overrides: Record<string, string> = {}) =>
  ({
    get: (k: string) =>
      ({
        MERCADOPAGO_ACCESS_TOKEN: 'token',
        MONEDA_PAGO: 'ARS',
        ORIGEN_FRONTEND: 'https://front.test',
        URL_BACKEND: 'https://back.test',
        ...overrides,
      })[k],
  }) as unknown as ConfigService;

function crear(prisma: Record<string, unknown>, config = CONFIG()) {
  return new PagosService(prisma as unknown as PrismaService, config);
}

describe('PagosService', () => {
  describe('iniciarCheckout', () => {
    it('503 si no hay token de Mercado Pago', async () => {
      const service = crear({}, CONFIG({ MERCADOPAGO_ACCESS_TOKEN: '' }));
      await expect(service.iniciarCheckout('org1', PlanSuscripcion.AGENCY)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('400 si el plan no es pagable (PRUEBA/ENTERPRISE)', async () => {
      const service = crear({ pago: { create: jest.fn() } });
      await expect(
        service.iniciarCheckout('org1', PlanSuscripcion.ENTERPRISE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea la fila PENDIENTE y devuelve la URL de checkout', async () => {
      const create = jest.fn().mockResolvedValue({});
      const service = crear({ pago: { create } });
      jest
        .spyOn(ClienteMercadoPago.prototype, 'crearPreferencia')
        .mockResolvedValue({ preferenciaId: 'pref1', urlCheckout: 'https://mp/checkout' });

      const res = await service.iniciarCheckout('org1', PlanSuscripcion.AGENCY);

      expect(res).toEqual({ urlCheckout: 'https://mp/checkout' });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizacionId: 'org1',
            plan: PlanSuscripcion.AGENCY,
            estado: EstadoPago.PENDIENTE,
          }),
        }),
      );
    });
  });

  describe('procesarWebhook', () => {
    it('ignora notificaciones que no son de pago', async () => {
      const service = crear({});
      const res = await service.procesarWebhook('plan', '123');
      expect(res).toEqual({ procesado: false });
    });

    it('un pago aprobado activa el plan y saca de suspensión, en transacción', async () => {
      const tx = jest.fn().mockResolvedValue([]);
      const service = crear({
        pago: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'p1',
            organizacionId: 'org1',
            plan: PlanSuscripcion.AGENCY,
            estado: EstadoPago.PENDIENTE,
          }),
          update: jest.fn(),
        },
        organizacion: { update: jest.fn() },
        $transaction: tx,
      });
      jest.spyOn(ClienteMercadoPago.prototype, 'obtenerPago').mockResolvedValue({
        id: 999,
        status: 'approved',
        external_reference: 'ref-1',
      });

      const res = await service.procesarWebhook('payment', '999');

      expect(res).toEqual({ procesado: true });
      expect(tx).toHaveBeenCalled(); // pago→APROBADO + org→plan en una sola transacción
    });

    it('es idempotente: un pago ya APROBADO no se reactiva', async () => {
      const tx = jest.fn();
      const service = crear({
        pago: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: EstadoPago.APROBADO }),
        },
        $transaction: tx,
      });
      jest.spyOn(ClienteMercadoPago.prototype, 'obtenerPago').mockResolvedValue({
        id: 999,
        status: 'approved',
        external_reference: 'ref-1',
      });

      const res = await service.procesarWebhook('payment', '999');

      expect(res).toEqual({ procesado: true });
      expect(tx).not.toHaveBeenCalled();
    });

    it('un pago sin fila local se ignora (no activa nada)', async () => {
      const tx = jest.fn();
      const service = crear({
        pago: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: tx,
      });
      jest.spyOn(ClienteMercadoPago.prototype, 'obtenerPago').mockResolvedValue({
        id: 999,
        status: 'approved',
        external_reference: 'ref-inventada',
      });

      const res = await service.procesarWebhook('payment', '999');

      expect(res).toEqual({ procesado: false });
      expect(tx).not.toHaveBeenCalled();
    });
  });

  afterEach(() => jest.restoreAllMocks());
});
