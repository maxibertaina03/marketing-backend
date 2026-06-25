import { Test } from '@nestjs/testing';
import { EstadoContenido, EstadoCliente } from '@prisma/client';
import { AutomatizacionesService } from './automatizaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { InformesService } from '../informes/informes.service';

const mockPubs = [
  { id: 'pub1', titulo: 'Post 1', organizacionId: 'org1' },
  { id: 'pub2', titulo: 'Post 2', organizacionId: 'org1' },
];

describe('AutomatizacionesService', () => {
  let service: AutomatizacionesService;
  let prisma: {
    publicacion: { findMany: jest.Mock; update: jest.Mock };
    organizacion: { findMany: jest.Mock };
    cliente: { findMany: jest.Mock };
    ejecucionJob: { create: jest.Mock; count: jest.Mock; findMany: jest.Mock };
  };
  let informes: { generar: jest.Mock };

  beforeEach(async () => {
    prisma = {
      publicacion: { findMany: jest.fn(), update: jest.fn() },
      organizacion: { findMany: jest.fn() },
      cliente: { findMany: jest.fn() },
      ejecucionJob: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    };
    informes = { generar: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        AutomatizacionesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InformesService, useValue: informes },
      ],
    }).compile();

    service = mod.get(AutomatizacionesService);
  });

  describe('publicarProgramadas', () => {
    it('actualiza publicaciones a PUBLICADO y persiste ejecucion', async () => {
      prisma.publicacion.findMany.mockResolvedValue(mockPubs);
      prisma.publicacion.update.mockResolvedValue({});
      prisma.ejecucionJob.create.mockResolvedValue({});

      const res = await service.publicarProgramadas();

      expect(prisma.publicacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ estado: EstadoContenido.APROBADO }) }),
      );
      expect(prisma.publicacion.update).toHaveBeenCalledTimes(2);
      expect(res.publicadas).toBe(2);
      expect(res.errores).toBe(0);
      expect(prisma.ejecucionJob.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipo: 'PUBLICAR_PROGRAMADAS' }) }),
      );
    });

    it('registra errores individuales sin detener el loop', async () => {
      prisma.publicacion.findMany.mockResolvedValue(mockPubs);
      prisma.publicacion.update
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB error'));
      prisma.ejecucionJob.create.mockResolvedValue({});

      const res = await service.publicarProgramadas();
      expect(res.publicadas).toBe(1);
      expect(res.errores).toBe(1);
    });

    it('retorna 0 publicadas si no hay nada programado', async () => {
      prisma.publicacion.findMany.mockResolvedValue([]);
      prisma.ejecucionJob.create.mockResolvedValue({});
      const res = await service.publicarProgramadas();
      expect(res.publicadas).toBe(0);
    });
  });

  describe('generarInformesMensuales', () => {
    it('genera informe para cada cliente activo de cada org', async () => {
      prisma.organizacion.findMany.mockResolvedValue([{ id: 'org1' }, { id: 'org2' }]);
      prisma.cliente.findMany.mockResolvedValue([{ id: 'cli1' }]);
      informes.generar.mockResolvedValue({});
      prisma.ejecucionJob.create.mockResolvedValue({});

      const res = await service.generarInformesMensuales();
      expect(informes.generar).toHaveBeenCalledTimes(2); // 1 cliente × 2 orgs
      expect(res.generados).toBe(2);
    });

    it('registra errores sin detener el loop', async () => {
      prisma.organizacion.findMany.mockResolvedValue([{ id: 'org1' }]);
      prisma.cliente.findMany.mockResolvedValue([{ id: 'cli1' }, { id: 'cli2' }]);
      informes.generar.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('IA error'));
      prisma.ejecucionJob.create.mockResolvedValue({});

      const res = await service.generarInformesMensuales();
      expect(res.generados).toBe(1);
      expect(res.errores).toBe(1);
    });
  });

  describe('historial', () => {
    it('devuelve paginado', async () => {
      prisma.ejecucionJob.count.mockResolvedValue(3);
      prisma.ejecucionJob.findMany.mockResolvedValue([]);
      const res = await service.historial({ pagina: 1, limite: 10 });
      expect(res.total).toBe(3);
    });
  });
});
