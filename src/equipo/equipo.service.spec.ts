import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { EquipoService } from './equipo.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanesService } from '../planes/planes.service';

describe('EquipoService — vínculo CLIENTE ↔ marca', () => {
  let service: EquipoService;
  let prisma: {
    usuario: { findUnique: jest.Mock };
    cliente: { findFirst: jest.Mock };
    membresia: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    invitacion: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn() },
      cliente: { findFirst: jest.fn() },
      membresia: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      invitacion: { upsert: jest.fn() },
    };
    const modulo = await Test.createTestingModule({
      providers: [
        EquipoService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanesService, useValue: { verificarPuedeInvitarInterno: jest.fn() } },
      ],
    }).compile();
    service = modulo.get(EquipoService);
  });

  it('invitar como CLIENTE sin clienteId → 400 (sin tocar usuario)', async () => {
    await expect(
      service.invitar('org_1', { email: 'cli@x.com', rol: Rol.CLIENTE }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('invitar como CLIENTE con una marca de otra organización → 403', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(
      service.invitar('org_1', { email: 'cli@x.com', rol: Rol.CLIENTE, clienteId: 'ajena' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('invitar como CLIENTE con marca válida → guarda la invitación con clienteId', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cli_1' });
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.invitacion.upsert.mockResolvedValue({ id: 'inv_1' });

    await service.invitar('org_1', { email: 'cli@x.com', rol: Rol.CLIENTE, clienteId: 'cli_1' });

    const arg = prisma.invitacion.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ rol: Rol.CLIENTE, clienteId: 'cli_1' });
    expect(arg.update).toMatchObject({ clienteId: 'cli_1' });
  });

  it('invitar como rol no-CLIENTE ignora el clienteId (queda null)', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.invitacion.upsert.mockResolvedValue({ id: 'inv_1' });

    await service.invitar('org_1', {
      email: 'cm@x.com',
      rol: Rol.COMMUNITY_MANAGER,
      clienteId: 'cli_1',
    });

    expect(prisma.cliente.findFirst).not.toHaveBeenCalled();
    expect(prisma.invitacion.upsert.mock.calls[0][0].create.clienteId).toBeNull();
  });

  it('cambiarRol a CLIENTE vincula la marca; a otro rol la desvincula', async () => {
    prisma.membresia.findFirst.mockResolvedValue({ id: 'm_1', rol: Rol.COMMUNITY_MANAGER });
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cli_1' });
    prisma.membresia.update.mockResolvedValue({ id: 'm_1' });

    await service.cambiarRol('org_1', 'm_1', Rol.CLIENTE, 'cli_1');
    expect(prisma.membresia.update).toHaveBeenCalledWith({
      where: { id: 'm_1' },
      data: { rol: Rol.CLIENTE, clienteId: 'cli_1' },
    });

    prisma.membresia.findFirst.mockResolvedValue({ id: 'm_1', rol: Rol.CLIENTE });
    await service.cambiarRol('org_1', 'm_1', Rol.DISENADOR);
    expect(prisma.membresia.update).toHaveBeenLastCalledWith({
      where: { id: 'm_1' },
      data: { rol: Rol.DISENADOR, clienteId: null },
    });
  });
});
