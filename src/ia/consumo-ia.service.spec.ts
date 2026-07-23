import { ForbiddenException } from '@nestjs/common';
import { PlanSuscripcion } from '@prisma/client';
import { ConsumoIaService } from './consumo-ia.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificacionesService } from '../notificaciones/notificaciones.service';
import { LIMITES } from '../planes/limites';

const ORG_BASE = {
  plan: PlanSuscripcion.STARTER,
  planExpiraEn: null,
  limiteMarcas: null,
  limiteUsuariosInternos: null,
  limiteGeneracionesIa: null,
  limiteIaPorUsuario: null,
};

function crear(prisma: Record<string, unknown>, notificaciones: Record<string, unknown> = {}) {
  return new ConsumoIaService(
    prisma as unknown as PrismaService,
    { emitir: jest.fn(), ...notificaciones } as unknown as NotificacionesService,
  );
}

describe('ConsumoIaService', () => {
  describe('verificar', () => {
    it('deja pasar si todavía hay cuota', async () => {
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: 10 }) },
      });

      await expect(service.verificar('org1')).resolves.toBeUndefined();
    });

    it('bloquea al llegar al límite del plan', async () => {
      const limite = LIMITES.STARTER.generacionesIaPorMes!;
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: limite }) },
      });

      await expect(service.verificar('org1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('el bloqueo dice cuánto se usó y de cuánto, para poder mostrarlo', async () => {
      const limite = LIMITES.STARTER.generacionesIaPorMes!;
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: limite + 3 }) },
      });

      await expect(service.verificar('org1')).rejects.toMatchObject({
        response: {
          codigo: 'CUOTA_IA_AGOTADA',
          consumido: limite + 3,
          limite,
        },
      });
    });

    it('ENTERPRISE no tiene tope: no consulta el consumo siquiera', async () => {
      const findUnique = jest.fn();
      const service = crear({
        organizacion: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...ORG_BASE, plan: PlanSuscripcion.ENTERPRISE }),
        },
        consumoIa: { findUnique },
      });

      await expect(service.verificar('org1')).resolves.toBeUndefined();
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('el override de la organización le gana al límite del plan', async () => {
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ ...ORG_BASE, limiteGeneracionesIa: 500 }),
        },
        // 200 supera el límite de STARTER (150) pero no el override de 500.
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: 200 }) },
      });

      await expect(service.verificar('org1')).resolves.toBeUndefined();
    });

    it('una prueba vencida se limita como STARTER', async () => {
      const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const service = crear({
        organizacion: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...ORG_BASE, plan: PlanSuscripcion.PRUEBA, planExpiraEn: ayer }),
        },
        // 200 está dentro de PRUEBA (750) pero fuera de STARTER (150).
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: 200 }) },
      });

      await expect(service.verificar('org1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('el sub-límite por persona bloquea aunque la agencia tenga cuota', async () => {
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ ...ORG_BASE, limiteIaPorUsuario: 20 }),
        },
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: 5 }) },
        generacionIa: { count: jest.fn().mockResolvedValue(20) },
      });

      await expect(service.verificar('org1', 'u1')).rejects.toMatchObject({
        response: { codigo: 'CUOTA_IA_USUARIO_AGOTADA', limite: 20 },
      });
    });

    it('sin sub-límite configurado no se cuenta por persona', async () => {
      const count = jest.fn();
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
        consumoIa: { findUnique: jest.fn().mockResolvedValue({ generaciones: 5 }) },
        generacionIa: { count },
      });

      await service.verificar('org1', 'u1');

      expect(count).not.toHaveBeenCalled();
    });
  });

  describe('registrar', () => {
    it('avisa una sola vez al cruzar el 80% de la cuota', async () => {
      const emitir = jest.fn().mockResolvedValue({ creados: 1, actualizados: 0 });
      const update = jest.fn().mockResolvedValue({});
      // STARTER: 150 → el 80% es 120.
      const service = crear(
        {
          organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
          consumoIa: {
            upsert: jest.fn().mockResolvedValue({ generaciones: 120, avisadoEn: null }),
            update,
          },
        },
        { emitir },
      );

      await service.registrar('org1', 'claude-haiku-4-5', {
        entrada: 1000,
        salida: 500,
        cacheEscritura: 0,
        cacheLectura: 0,
      });

      expect(emitir).toHaveBeenCalledWith(
        'org1',
        expect.objectContaining({ tipo: 'CUOTA_IA_CERCA' }),
      );
      // Se marca para no repetirlo en cada generación posterior.
      expect(update).toHaveBeenCalled();
    });

    it('no vuelve a avisar si ya se avisó este período', async () => {
      const emitir = jest.fn();
      const service = crear(
        {
          organizacion: { findUnique: jest.fn() },
          consumoIa: {
            upsert: jest.fn().mockResolvedValue({ generaciones: 149, avisadoEn: new Date() }),
          },
        },
        { emitir },
      );

      await service.registrar('org1', 'claude-haiku-4-5', {
        entrada: 1000,
        salida: 500,
        cacheEscritura: 0,
        cacheLectura: 0,
      });

      expect(emitir).not.toHaveBeenCalled();
    });

    it('si el aviso falla, la generación no se cae', async () => {
      const service = crear(
        {
          organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_BASE) },
          consumoIa: {
            upsert: jest.fn().mockResolvedValue({ generaciones: 140, avisadoEn: null }),
            update: jest.fn(),
          },
        },
        { emitir: jest.fn().mockRejectedValue(new Error('sin conexión')) },
      );

      await expect(
        service.registrar('org1', 'claude-haiku-4-5', {
          entrada: 1000,
          salida: 500,
          cacheEscritura: 0,
          cacheLectura: 0,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
