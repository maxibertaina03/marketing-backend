import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaService } from './meta.service';
import { PrismaService } from '../prisma/prisma.service';

const CONFIG_OK: Record<string, string> = {
  META_IG_APP_ID: 'app123',
  META_IG_APP_SECRET: 'secreto',
  META_REDIRECT_URI: 'https://api.test/api/meta/callback',
  ORIGEN_FRONTEND: 'https://front.test',
};

function crear(config: Record<string, string>, prismaMock: Record<string, unknown>) {
  const prisma = prismaMock as unknown as PrismaService;
  const configService = { get: (clave: string) => config[clave] } as unknown as ConfigService;
  return new MetaService(prisma, configService);
}

describe('MetaService', () => {
  it('iniciarConexion: arma la URL de Instagram con un state firmado', async () => {
    const prisma = { cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) } };
    const service = crear(CONFIG_OK, prisma);

    const { url } = await service.iniciarConexion('org1', 'c1');

    expect(url).toContain('https://www.instagram.com/oauth/authorize');
    expect(url).toContain('client_id=app123');
    expect(url).toContain('state=');
    expect(url).toContain('instagram_business_manage_insights');
  });

  it('iniciarConexion: 404 si el cliente no es de la organización', async () => {
    const prisma = { cliente: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = crear(CONFIG_OK, prisma);

    await expect(service.iniciarConexion('org1', 'ajeno')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('iniciarConexion: 503 si faltan las credenciales de Meta', async () => {
    const prisma = { cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) } };
    const service = crear({}, prisma);

    await expect(service.iniciarConexion('org1', 'c1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('estado: devuelve { conectado: false } cuando no hay conexión', async () => {
    const prisma = {
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
      conexionMeta: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = crear(CONFIG_OK, prisma);

    expect(await service.estado('org1', 'c1')).toEqual({ conectado: false });
  });

  it('procesarCallback: con state inválido redirige al front con error', async () => {
    const service = crear(CONFIG_OK, {});

    const url = await service.procesarCallback('code', 'state.falso');

    expect(url).toBe('https://front.test/clientes?meta=error');
  });

  describe('publicar', () => {
    const pubBase = {
      id: 'pub1',
      clienteId: 'cli1',
      contenido: 'Hola',
      imagenUrl: 'https://cdn.test/foto.jpg',
      canal: 'INSTAGRAM',
      estado: 'APROBADO',
      metaMediaId: null,
    };

    it('404 si la publicación no es de la organización', async () => {
      const prisma = { publicacion: { findFirst: jest.fn().mockResolvedValue(null) } };
      const service = crear(CONFIG_OK, prisma);

      await expect(service.publicar('org1', { publicacionId: 'ajena' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 si la publicación no tiene imagen con URL pública', async () => {
      const prisma = {
        publicacion: { findFirst: jest.fn().mockResolvedValue({ ...pubBase, imagenUrl: null }) },
      };
      const service = crear(CONFIG_OK, prisma);

      await expect(service.publicar('org1', { publicacionId: 'pub1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si ya fue publicada en Instagram', async () => {
      const prisma = {
        publicacion: {
          findFirst: jest.fn().mockResolvedValue({ ...pubBase, metaMediaId: 'ig_9' }),
        },
      };
      const service = crear(CONFIG_OK, prisma);

      await expect(service.publicar('org1', { publicacionId: 'pub1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si la marca no tiene Instagram conectado', async () => {
      const prisma = {
        publicacion: { findFirst: jest.fn().mockResolvedValue(pubBase) },
        conexionMeta: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const service = crear(CONFIG_OK, prisma);

      await expect(service.publicar('org1', { publicacionId: 'pub1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
