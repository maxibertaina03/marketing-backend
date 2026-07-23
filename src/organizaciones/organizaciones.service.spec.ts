import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { OrganizacionesService } from './organizaciones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizacionesService', () => {
  let service: OrganizacionesService;
  let prisma: {
    organizacion: { create: jest.Mock; delete: jest.Mock };
    membresia: { findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock; delete: jest.Mock };
    cliente: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      organizacion: { create: jest.fn(), delete: jest.fn() },
      membresia: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), delete: jest.fn() },
      cliente: { count: jest.fn() },
    };

    const modulo = await Test.createTestingModule({
      providers: [OrganizacionesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = modulo.get(OrganizacionesService);
  });

  it('crea la organización y al creador como ADMIN', async () => {
    prisma.organizacion.create.mockResolvedValue({ id: 'org_1', nombre: 'Agencia' });

    await service.crear('usr_1', { nombre: 'Agencia' });

    expect(prisma.organizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nombre: 'Agencia',
          membresias: { create: { usuarioId: 'usr_1', rol: Rol.ADMIN } },
        }),
      }),
    );
  });

  it('listarMias marca vacía la agencia sin marcas y soyUnicoMiembro con un solo miembro', async () => {
    prisma.membresia.findMany.mockResolvedValue([
      {
        organizacionId: 'org_1',
        rol: Rol.ADMIN,
        organizacion: {
          nombre: 'Agencia',
          plan: 'AGENCY',
          planExpiraEn: null,
          _count: { clientes: 0, membresias: 1 },
        },
      },
    ]);

    const [org] = await service.listarMias('usr_1');

    expect(org).toMatchObject({ vacia: true, soyUnicoMiembro: true, rol: Rol.ADMIN });
  });

  describe('salir', () => {
    it('404 si no pertenece a la organización', async () => {
      prisma.membresia.findFirst.mockResolvedValue(null);
      await expect(service.salir('org_1', 'usr_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403 si el miembro no es ADMIN', async () => {
      prisma.membresia.findFirst.mockResolvedValue({ id: 'm1', rol: Rol.COMMUNITY_MANAGER });
      await expect(service.salir('org_1', 'usr_1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('409 si la agencia todavía tiene marcas', async () => {
      prisma.membresia.findFirst.mockResolvedValue({ id: 'm1', rol: Rol.ADMIN });
      prisma.cliente.count.mockResolvedValue(2);
      await expect(service.salir('org_1', 'usr_1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('elimina la agencia si el ADMIN era el único miembro', async () => {
      prisma.membresia.findFirst.mockResolvedValue({ id: 'm1', rol: Rol.ADMIN });
      prisma.cliente.count.mockResolvedValue(0);
      prisma.membresia.count.mockResolvedValue(0); // no hay otros miembros
      prisma.organizacion.delete.mockResolvedValue({});

      const res = await service.salir('org_1', 'usr_1');

      expect(res).toEqual({ accion: 'eliminada' });
      expect(prisma.organizacion.delete).toHaveBeenCalledWith({ where: { id: 'org_1' } });
      expect(prisma.membresia.delete).not.toHaveBeenCalled();
    });

    it('abandona (borra solo su membresía) si quedan otros con un ADMIN', async () => {
      prisma.membresia.findFirst.mockResolvedValue({ id: 'm1', rol: Rol.ADMIN });
      prisma.cliente.count.mockResolvedValue(0);
      // 1ra llamada: otros miembros = 2; 2da: otros admins = 1
      prisma.membresia.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      prisma.membresia.delete.mockResolvedValue({});

      const res = await service.salir('org_1', 'usr_1');

      expect(res).toEqual({ accion: 'abandonada' });
      expect(prisma.membresia.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
      expect(prisma.organizacion.delete).not.toHaveBeenCalled();
    });

    it('409 si es el único ADMIN pero quedan otros miembros', async () => {
      prisma.membresia.findFirst.mockResolvedValue({ id: 'm1', rol: Rol.ADMIN });
      prisma.cliente.count.mockResolvedValue(0);
      // otros miembros = 3, pero otros admins = 0
      prisma.membresia.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

      await expect(service.salir('org_1', 'usr_1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.membresia.delete).not.toHaveBeenCalled();
    });
  });
});
