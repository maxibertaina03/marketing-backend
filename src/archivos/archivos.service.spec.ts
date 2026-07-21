import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TipoArchivo } from '@prisma/client';
import { ArchivosService } from './archivos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ArchivosService', () => {
  let service: ArchivosService;
  let prisma: {
    archivo: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cliente: { findFirst: jest.Mock };
    publicacion: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      archivo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cliente: { findFirst: jest.fn() },
      publicacion: { findFirst: jest.fn() },
    };

    const modulo = await Test.createTestingModule({
      providers: [
        ArchivosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (clave: string) =>
              ({
                CLOUDINARY_CLOUD_NAME: 'demo',
                CLOUDINARY_API_KEY: '123',
                CLOUDINARY_API_SECRET: 'secreto',
              })[clave],
          },
        },
      ],
    }).compile();

    service = modulo.get(ArchivosService);
  });

  it('registra el archivo tras validar el cliente, acotado a la organización', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cli_1' });
    prisma.archivo.create.mockResolvedValue({ id: 'arch_1' });

    await service.crear('org_1', {
      nombre: 'logo.png',
      url: 'https://x/logo.png',
      clienteId: 'cli_1',
      tipo: TipoArchivo.IMAGEN,
    });

    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cli_1', organizacionId: 'org_1' },
      select: { id: true },
    });
    expect(prisma.archivo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clienteId: 'cli_1',
        organizacionId: 'org_1',
        publicacionId: null,
      }),
    });
  });

  it('rechaza registrar si el cliente no es de la organización (403, sin crear)', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      service.crear('org_1', { nombre: 'x', url: 'https://x', clienteId: 'ajeno' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.archivo.create).not.toHaveBeenCalled();
  });

  it('valida la publicación cuando se asocia una al crear', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cli_1' });
    prisma.publicacion.findFirst.mockResolvedValue(null);

    await expect(
      service.crear('org_1', {
        nombre: 'x',
        url: 'https://x',
        clienteId: 'cli_1',
        publicacionId: 'ajena',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.archivo.create).not.toHaveBeenCalled();
  });

  it('lista filtrando por organización, cliente y tipo', async () => {
    prisma.archivo.findMany.mockResolvedValue([]);

    await service.listar('org_1', { clienteId: 'cli_1', tipo: TipoArchivo.DOCUMENTO });

    const where = prisma.archivo.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      organizacionId: 'org_1',
      clienteId: 'cli_1',
      tipo: TipoArchivo.DOCUMENTO,
    });
  });

  it('lanza 404 al obtener un archivo de otra organización', async () => {
    prisma.archivo.findFirst.mockResolvedValue(null);

    await expect(service.obtener('org_1', 'ajeno')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('firmarSubida: valida el cliente y devuelve la firma con carpeta por org/cliente', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cli_1' });

    const firma = await service.firmarSubida('org_1', { clienteId: 'cli_1' });

    expect(firma.folder).toBe('contentos/org_1/cli_1');
    expect(firma.url).toContain('https://api.cloudinary.com/v1_1/demo/');
    expect(firma.apiKey).toBe('123');
    expect(firma.signature).toHaveLength(40); // sha1 hex
  });

});
