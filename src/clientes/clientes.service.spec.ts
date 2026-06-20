import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EstadoCliente } from '@prisma/client';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: {
    cliente: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      cliente: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const modulo = await Test.createTestingModule({
      providers: [ClientesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = modulo.get(ClientesService);
  });

  it('crea el cliente acotado a la organización y con paleta por defecto', async () => {
    prisma.cliente.create.mockResolvedValue({ id: 'cli_1' });

    await service.crear('org_1', { nombre: 'Café' });

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: 'Café',
        organizacionId: 'org_1',
        paletaColores: [],
      }),
    });
  });

  it('lista filtrando por organización, estado y búsqueda', async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await service.listar('org_1', { estado: EstadoCliente.ACTIVO, busqueda: 'caf' });

    const where = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(where.organizacionId).toBe('org_1');
    expect(where.estado).toBe(EstadoCliente.ACTIVO);
    expect(where.OR).toEqual([
      { nombre: { contains: 'caf', mode: 'insensitive' } },
      { rubro: { contains: 'caf', mode: 'insensitive' } },
    ]);
  });

  it('lanza 404 al obtener un cliente que no es de la organización', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(service.obtener('org_1', 'cli_otra')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cli_otra', organizacionId: 'org_1' },
    });
  });
});
