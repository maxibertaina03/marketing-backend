import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoContenido, Rol } from '@prisma/client';
import { AprobacionesService } from './aprobaciones.service';
import { PrismaService } from '../prisma/prisma.service';

const ctxAdmin = { organizacionId: 'org1', membresiaId: 'm1', rol: Rol.ADMIN, clienteId: null };
const ctxCliente = { organizacionId: 'org1', membresiaId: 'm2', rol: Rol.CLIENTE, clienteId: 'cli1' };
const ctxClienteOtro = { organizacionId: 'org1', membresiaId: 'm3', rol: Rol.CLIENTE, clienteId: 'cli2' };

const pubEnRevision = {
  id: 'pub1',
  titulo: 'Test',
  clienteId: 'cli1',
  organizacionId: 'org1',
  estado: EstadoContenido.EN_REVISION,
  motivoRechazo: null,
};

const pubBorrador = { ...pubEnRevision, estado: EstadoContenido.BORRADOR };
const pubAprobada = { ...pubEnRevision, estado: EstadoContenido.APROBADO };

describe('AprobacionesService', () => {
  let service: AprobacionesService;
  let prisma: {
    publicacion: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      publicacion: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const mod = await Test.createTestingModule({
      providers: [AprobacionesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = mod.get(AprobacionesService);
  });

  describe('listar', () => {
    it('devuelve paginado con estado EN_REVISION', async () => {
      prisma.publicacion.count.mockResolvedValue(1);
      prisma.publicacion.findMany.mockResolvedValue([pubEnRevision]);
      const res = await service.listar('org1', {});
      expect(res.total).toBe(1);
      expect(prisma.publicacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ estado: EstadoContenido.EN_REVISION }) }),
      );
    });
  });

  describe('enviarRevision', () => {
    it('mueve BORRADOR → EN_REVISION y limpia motivoRechazo', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubBorrador);
      prisma.publicacion.update.mockResolvedValue({ ...pubBorrador, estado: EstadoContenido.EN_REVISION, motivoRechazo: null });
      const res = await service.enviarRevision('org1', 'pub1');
      expect(prisma.publicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: EstadoContenido.EN_REVISION, motivoRechazo: null } }),
      );
      expect(res.estado).toBe(EstadoContenido.EN_REVISION);
    });

    it('lanza 409 si ya está APROBADA', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubAprobada);
      await expect(service.enviarRevision('org1', 'pub1')).rejects.toThrow(ConflictException);
    });

    it('lanza 404 si no existe', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(null);
      await expect(service.enviarRevision('org1', 'pub1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('aprobar', () => {
    it('mueve EN_REVISION → APROBADO y limpia motivoRechazo', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubEnRevision);
      prisma.publicacion.update.mockResolvedValue({ ...pubEnRevision, estado: EstadoContenido.APROBADO, motivoRechazo: null });
      await service.aprobar('org1', 'pub1', {}, ctxAdmin);
      expect(prisma.publicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: EstadoContenido.APROBADO, motivoRechazo: null } }),
      );
    });

    it('CLIENTE puede aprobar su propia marca', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubEnRevision);
      prisma.publicacion.update.mockResolvedValue({ ...pubEnRevision, estado: EstadoContenido.APROBADO });
      await expect(service.aprobar('org1', 'pub1', {}, ctxCliente)).resolves.toBeDefined();
    });

    it('CLIENTE no puede aprobar publicación de otra marca', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubEnRevision);
      await expect(service.aprobar('org1', 'pub1', {}, ctxClienteOtro)).rejects.toThrow(ForbiddenException);
    });

    it('lanza 409 si no está EN_REVISION', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubBorrador);
      await expect(service.aprobar('org1', 'pub1', {}, ctxAdmin)).rejects.toThrow(ConflictException);
    });
  });

  describe('rechazar', () => {
    it('mueve EN_REVISION → RECHAZADO y guarda motivo', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubEnRevision);
      prisma.publicacion.update.mockResolvedValue({ ...pubEnRevision, estado: EstadoContenido.RECHAZADO, motivoRechazo: 'Falta imagen' });
      await service.rechazar('org1', 'pub1', { motivo: 'Falta imagen' }, ctxAdmin);
      expect(prisma.publicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: EstadoContenido.RECHAZADO, motivoRechazo: 'Falta imagen' } }),
      );
    });

    it('CLIENTE no puede rechazar publicación de otra marca', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubEnRevision);
      await expect(service.rechazar('org1', 'pub1', { motivo: 'x' }, ctxClienteOtro)).rejects.toThrow(ForbiddenException);
    });

    it('lanza 409 si no está EN_REVISION', async () => {
      prisma.publicacion.findFirst.mockResolvedValue(pubAprobada);
      await expect(service.rechazar('org1', 'pub1', { motivo: 'x' }, ctxAdmin)).rejects.toThrow(ConflictException);
    });
  });
});
