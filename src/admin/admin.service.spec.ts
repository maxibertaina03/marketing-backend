import { NotFoundException } from '@nestjs/common';
import { PlanSuscripcion } from '@prisma/client';
import { AdminService } from './admin.service';
import type { PrismaService } from '../prisma/prisma.service';

function crear(prisma: Record<string, unknown>) {
  return new AdminService(prisma as unknown as PrismaService);
}

describe('AdminService', () => {
  describe('suspender', () => {
    it('suspende y deja registro de auditoría con el email del superadmin', async () => {
      const update = jest.fn().mockResolvedValue({});
      const auditar = jest.fn().mockResolvedValue({});
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue({ id: 'org1' }), update },
        auditoriaAdmin: { create: auditar },
      });

      const res = await service.suspender('masita@x.com', 'org1', true);

      expect(res).toEqual({ suspendida: true });
      expect(update).toHaveBeenCalledWith({ where: { id: 'org1' }, data: { suspendida: true } });
      expect(auditar).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ superadmin: 'masita@x.com', accion: 'SUSPENDER' }),
        }),
      );
    });

    it('reactivar registra la acción REACTIVAR', async () => {
      const auditar = jest.fn().mockResolvedValue({});
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ id: 'org1' }),
          update: jest.fn().mockResolvedValue({}),
        },
        auditoriaAdmin: { create: auditar },
      });

      await service.suspender('masita@x.com', 'org1', false);

      expect(auditar).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accion: 'REACTIVAR' }) }),
      );
    });

    it('404 si la organización no existe', async () => {
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.suspender('masita@x.com', 'ajena', true)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cambiarPlan', () => {
    it('al salir de PRUEBA limpia el vencimiento y audita el cambio', async () => {
      const update = jest.fn().mockResolvedValue({ plan: PlanSuscripcion.AGENCY });
      const auditar = jest.fn().mockResolvedValue({});
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ id: 'org1', plan: PlanSuscripcion.PRUEBA }),
          update,
        },
        auditoriaAdmin: { create: auditar },
      });

      await service.cambiarPlan('masita@x.com', 'org1', { plan: PlanSuscripcion.AGENCY });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: { plan: PlanSuscripcion.AGENCY, planExpiraEn: null },
      });
      expect(auditar).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'CAMBIAR_PLAN',
            detalle: { de: PlanSuscripcion.PRUEBA, a: PlanSuscripcion.AGENCY },
          }),
        }),
      );
    });
  });

  describe('ajustarLimites', () => {
    it('null borra el override; un campo ausente no se toca', async () => {
      const update = jest.fn().mockResolvedValue({});
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue({ id: 'org1' }), update },
        auditoriaAdmin: { create: jest.fn().mockResolvedValue({}) },
      });

      await service.ajustarLimites('masita@x.com', 'org1', {
        limiteMarcas: null,
        limiteGeneracionesIa: 5000,
      });

      const data = update.mock.calls[0][0].data;
      expect(data).toEqual({ limiteMarcas: null, limiteGeneracionesIa: 5000 });
      expect(data).not.toHaveProperty('limiteUsuariosInternos');
    });
  });

  describe('reiniciarCuota', () => {
    it('pone en cero el consumo del período y limpia el aviso', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue({ id: 'org1' }) },
        consumoIa: { updateMany },
        auditoriaAdmin: { create: jest.fn().mockResolvedValue({}) },
      });

      const res = await service.reiniciarCuota('masita@x.com', 'org1');

      expect(res.reiniciada).toBe(true);
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { generaciones: 0, avisadoEn: null } }),
      );
    });
  });
});
