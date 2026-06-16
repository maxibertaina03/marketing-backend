import { Test } from '@nestjs/testing';
import { Rol } from '@prisma/client';
import { OrganizacionesService } from './organizaciones.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizacionesService', () => {
  let service: OrganizacionesService;
  let prisma: {
    organizacion: { create: jest.Mock };
    membresia: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      organizacion: { create: jest.fn() },
      membresia: { findMany: jest.fn() },
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

  it('mapea las organizaciones del usuario a {organizacionId, nombre, rol}', async () => {
    prisma.membresia.findMany.mockResolvedValue([
      { organizacionId: 'org_1', rol: Rol.ADMIN, organizacion: { nombre: 'Agencia' } },
    ]);

    const resultado = await service.listarMias('usr_1');

    expect(resultado).toEqual([{ organizacionId: 'org_1', nombre: 'Agencia', rol: Rol.ADMIN }]);
  });
});
