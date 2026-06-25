import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoTarea, TipoTarea } from '@prisma/client';
import { ProduccionService } from './produccion.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProduccionService', () => {
  let service: ProduccionService;
  let prisma: {
    tarea: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    publicacion: { findFirst: jest.Mock };
    membresia: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tarea: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      publicacion: { findFirst: jest.fn() },
      membresia: { findFirst: jest.fn() },
    };

    const modulo = await Test.createTestingModule({
      providers: [ProduccionService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = modulo.get(ProduccionService);
  });

  it('crea la tarea acotada a la organización tras validar la publicación', async () => {
    prisma.publicacion.findFirst.mockResolvedValue({ id: 'pub_1' });
    prisma.tarea.create.mockResolvedValue({ id: 'tar_1' });

    await service.crear('org_1', {
      titulo: 'Diseñar carrusel',
      publicacionId: 'pub_1',
      tipo: TipoTarea.DISENO,
    });

    expect(prisma.publicacion.findFirst).toHaveBeenCalledWith({
      where: { id: 'pub_1', organizacionId: 'org_1' },
      select: { id: true },
    });
    expect(prisma.tarea.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publicacionId: 'pub_1', organizacionId: 'org_1' }),
      }),
    );
  });

  it('rechaza crear si la publicación no es de la organización (403, sin crear)', async () => {
    prisma.publicacion.findFirst.mockResolvedValue(null);

    await expect(
      service.crear('org_1', { titulo: 'X', publicacionId: 'ajena' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tarea.create).not.toHaveBeenCalled();
  });

  it('rechaza crear si el responsable no pertenece a la organización', async () => {
    prisma.publicacion.findFirst.mockResolvedValue({ id: 'pub_1' });
    prisma.membresia.findFirst.mockResolvedValue(null);

    await expect(
      service.crear('org_1', { titulo: 'X', publicacionId: 'pub_1', asignadoId: 'mem_otra' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tarea.create).not.toHaveBeenCalled();
  });

  it('lanza 404 al obtener una tarea que no es de la organización', async () => {
    prisma.tarea.findFirst.mockResolvedValue(null);

    await expect(service.obtener('org_1', 'ajena')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tarea.findFirst).toHaveBeenCalledWith({
      where: { id: 'ajena', organizacionId: 'org_1' },
      include: expect.any(Object),
    });
  });

  it('tablero agrupa por estado con todas las columnas presentes', async () => {
    prisma.tarea.findMany.mockResolvedValue([
      { id: 't1', estado: EstadoTarea.PENDIENTE },
      { id: 't2', estado: EstadoTarea.HECHA },
      { id: 't3', estado: EstadoTarea.PENDIENTE },
    ]);

    const tablero = await service.tablero('org_1', {});

    expect(Object.keys(tablero).sort()).toEqual([...Object.values(EstadoTarea)].sort());
    expect(tablero.PENDIENTE).toHaveLength(2);
    expect(tablero.HECHA).toHaveLength(1);
    expect(tablero.EN_CURSO).toHaveLength(0);
  });
});
