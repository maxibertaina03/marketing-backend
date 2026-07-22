import { Rol, TipoNotificacion } from '@prisma/client';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';

const AVISO = {
  tipo: TipoNotificacion.APROBACIONES_PENDIENTES,
  clave: 'aprobaciones-pendientes',
  titulo: 'Tenés 3 publicaciones pendientes de aprobación.',
  enlace: '/aprobaciones',
};

function crear(prisma: Record<string, unknown>) {
  return new NotificacionesService(prisma as unknown as PrismaService);
}

describe('NotificacionesService', () => {
  describe('emitir', () => {
    it('sin destinatario declarado, va a ADMIN y COMMUNITY_MANAGER', async () => {
      const findMany = jest.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
      const create = jest.fn().mockResolvedValue({});
      const service = crear({
        membresia: { findMany },
        notificacion: { findFirst: jest.fn().mockResolvedValue(null), create },
      });

      const resultado = await service.emitir('org1', AVISO);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizacionId: 'org1', rol: { in: [Rol.ADMIN, Rol.COMMUNITY_MANAGER] } },
        }),
      );
      expect(resultado).toEqual({ creados: 2, actualizados: 0 });
    });

    it('si ya hay uno sin leer con la misma clave, lo actualiza en vez de duplicar', async () => {
      const update = jest.fn().mockResolvedValue({});
      const create = jest.fn();
      const service = crear({
        membresia: { findMany: jest.fn().mockResolvedValue([{ id: 'm1' }]) },
        notificacion: {
          findFirst: jest.fn().mockResolvedValue({ id: 'n1' }),
          update,
          create,
        },
      });

      const resultado = await service.emitir('org1', {
        ...AVISO,
        titulo: 'Tenés 5 publicaciones pendientes de aprobación.',
      });

      expect(create).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n1' },
          data: expect.objectContaining({
            titulo: 'Tenés 5 publicaciones pendientes de aprobación.',
          }),
        }),
      );
      expect(resultado).toEqual({ creados: 0, actualizados: 1 });
    });

    it('un aviso leído no frena uno nuevo: la condición volvió a darse', async () => {
      const create = jest.fn().mockResolvedValue({});
      const findFirst = jest.fn().mockResolvedValue(null); // solo busca los NO leídos
      const service = crear({
        membresia: { findMany: jest.fn().mockResolvedValue([{ id: 'm1' }]) },
        notificacion: { findFirst, create },
      });

      const resultado = await service.emitir('org1', AVISO);

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { membresiaId: 'm1', clave: AVISO.clave, leida: false },
        }),
      );
      expect(resultado).toEqual({ creados: 1, actualizados: 0 });
    });

    it('los destinatarios puntuales se validan contra la organización', async () => {
      // 'ajena' es de otra organización: la consulta no la devuelve y no recibe nada.
      const findMany = jest.fn().mockResolvedValue([{ id: 'm1' }]);
      const create = jest.fn().mockResolvedValue({});
      const service = crear({
        membresia: { findMany },
        notificacion: { findFirst: jest.fn().mockResolvedValue(null), create },
      });

      const resultado = await service.emitir('org1', {
        ...AVISO,
        tipo: TipoNotificacion.TAREA_ASIGNADA,
        paraMembresiaIds: ['m1', 'ajena'],
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizacionId: 'org1', id: { in: ['m1', 'ajena'] } },
        }),
      );
      expect(resultado).toEqual({ creados: 1, actualizados: 0 });
    });
  });

  describe('marcarLeida', () => {
    it('404 si el aviso no es del usuario', async () => {
      const service = crear({
        membresia: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
        notificacion: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.marcarLeida('org1', 'u1', 'ajena')).rejects.toThrow(
        'Notificación no encontrada.',
      );
    });

    it('no vuelve a escribir una ya leída', async () => {
      const update = jest.fn();
      const service = crear({
        membresia: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
        notificacion: {
          findFirst: jest.fn().mockResolvedValue({ id: 'n1', leida: true }),
          update,
        },
      });

      await service.marcarLeida('org1', 'u1', 'n1');

      expect(update).not.toHaveBeenCalled();
    });
  });
});
