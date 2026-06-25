import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoContenido } from '@prisma/client';
import { PortalClienteService } from './portal-cliente.service';
import { PrismaService } from '../prisma/prisma.service';

const pubVisible = {
  id: 'pub1',
  titulo: 'Test',
  clienteId: 'cli1',
  organizacionId: 'org1',
  estado: EstadoContenido.EN_REVISION,
  motivoRechazo: null,
  imagenUrl: null,
  fechaProgramada: null,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  cliente: { id: 'cli1', nombre: 'Marca A', logoUrl: null },
};

const pubBorrador = { ...pubVisible, estado: EstadoContenido.BORRADOR };
const pubOtraMarca = { ...pubVisible, clienteId: 'cli2' };

describe('PortalClienteService', () => {
  let service: PortalClienteService;
  let prisma: {
    publicacion: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      publicacion: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    };
    const mod = await Test.createTestingModule({
      providers: [PortalClienteService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(PortalClienteService);
  });

  describe('listarPublicaciones', () => {
    it('excluye BORRADOR del filtro de estados', async () => {
      prisma.publicacion.count.mockResolvedValue(0);
      prisma.publicacion.findMany.mockResolvedValue([]);
      await service.listarPublicaciones('org1', 'cli1', {});
      expect(prisma.publicacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: expect.objectContaining({ in: expect.not.arrayContaining([EstadoContenido.BORRADOR]) }),
          }),
        }),
      );
    });

    it('filtra por clienteId correcto', async () => {
      prisma.publicacion.count.mockResolvedValue(1);
      prisma.publicacion.findMany.mockResolvedValue([pubVisible]);
      const res = await service.listarPublicaciones('org1', 'cli1', {});
      expect(prisma.publicacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clienteId: 'cli1' }) }),
      );
      expect(res.total).toBe(1);
    });
  });

  describe('obtenerPublicacion', () => {
    it('devuelve la publicación si es de la marca correcta y visible', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubVisible);
      const res = await service.obtenerPublicacion('org1', 'cli1', 'pub1');
      expect(res.id).toBe('pub1');
    });

    it('lanza 403 si la publicación es de otra marca', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubOtraMarca);
      await expect(service.obtenerPublicacion('org1', 'cli1', 'pub1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza 403 si la publicación es BORRADOR', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubBorrador);
      await expect(service.obtenerPublicacion('org1', 'cli1', 'pub1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza 404 si no existe', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(null);
      await expect(service.obtenerPublicacion('org1', 'cli1', 'pub1')).rejects.toThrow(NotFoundException);
    });
  });
});
