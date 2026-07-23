import { ForbiddenException } from '@nestjs/common';
import { PlanSuscripcion, Rol } from '@prisma/client';
import { PlanesService } from './planes.service';
import type { PrismaService } from '../prisma/prisma.service';
import { LIMITES } from './limites';

const ORG_STARTER = {
  plan: PlanSuscripcion.STARTER,
  planExpiraEn: null,
  limiteMarcas: null,
  limiteUsuariosInternos: null,
  limiteGeneracionesIa: null,
};

function crear(prisma: Record<string, unknown>) {
  return new PlanesService(prisma as unknown as PrismaService);
}

describe('PlanesService', () => {
  describe('verificarPuedeCrearMarca', () => {
    it('deja crear si está por debajo del límite', async () => {
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_STARTER) },
        cliente: { count: jest.fn().mockResolvedValue(LIMITES.STARTER.marcas! - 1) },
      });
      await expect(service.verificarPuedeCrearMarca('org1')).resolves.toBeUndefined();
    });

    it('bloquea al alcanzar el límite del plan', async () => {
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_STARTER) },
        cliente: { count: jest.fn().mockResolvedValue(LIMITES.STARTER.marcas!) },
      });
      await expect(service.verificarPuedeCrearMarca('org1')).rejects.toMatchObject({
        response: { codigo: 'LIMITE_MARCAS', limite: LIMITES.STARTER.marcas },
      });
    });

    it('ENTERPRISE no tiene tope: ni cuenta las marcas', async () => {
      const count = jest.fn();
      const service = crear({
        organizacion: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...ORG_STARTER, plan: PlanSuscripcion.ENTERPRISE }),
        },
        cliente: { count },
      });
      await expect(service.verificarPuedeCrearMarca('org1')).resolves.toBeUndefined();
      expect(count).not.toHaveBeenCalled();
    });

    it('respeta el override de la organización', async () => {
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ ...ORG_STARTER, limiteMarcas: 50 }),
        },
        cliente: { count: jest.fn().mockResolvedValue(10) }, // > 3 (STARTER) pero < 50
      });
      await expect(service.verificarPuedeCrearMarca('org1')).resolves.toBeUndefined();
    });
  });

  describe('verificarPuedeInvitarInterno', () => {
    it('un CLIENTE nunca cuenta: no consulta límites', async () => {
      const findUnique = jest.fn();
      const service = crear({ organizacion: { findUnique } });
      await expect(
        service.verificarPuedeInvitarInterno('org1', Rol.CLIENTE),
      ).resolves.toBeUndefined();
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('bloquea cuando miembros + invitaciones internas llegan al límite', async () => {
      const limite = LIMITES.STARTER.usuariosInternos!; // 1
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_STARTER) },
        membresia: { count: jest.fn().mockResolvedValue(limite) },
        invitacion: { count: jest.fn().mockResolvedValue(0) },
      });
      await expect(
        service.verificarPuedeInvitarInterno('org1', Rol.COMMUNITY_MANAGER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('las invitaciones pendientes también ocupan cupo', async () => {
      const service = crear({
        organizacion: { findUnique: jest.fn().mockResolvedValue(ORG_STARTER) },
        // 0 miembros pero 1 invitación pendiente = 1, que ya es el límite de STARTER.
        membresia: { count: jest.fn().mockResolvedValue(0) },
        invitacion: { count: jest.fn().mockResolvedValue(1) },
      });
      await expect(
        service.verificarPuedeInvitarInterno('org1', Rol.DISENADOR),
      ).rejects.toMatchObject({ response: { codigo: 'LIMITE_USUARIOS' } });
    });

    it('deja invitar si hay lugar', async () => {
      const service = crear({
        organizacion: {
          findUnique: jest.fn().mockResolvedValue({ ...ORG_STARTER, plan: PlanSuscripcion.AGENCY }),
        },
        membresia: { count: jest.fn().mockResolvedValue(2) },
        invitacion: { count: jest.fn().mockResolvedValue(1) }, // 3 de 5 (AGENCY)
      });
      await expect(
        service.verificarPuedeInvitarInterno('org1', Rol.COPYWRITER),
      ).resolves.toBeUndefined();
    });
  });
});
