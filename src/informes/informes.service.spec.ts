import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InformesService } from './informes.service';
import { PrismaService } from '../prisma/prisma.service';
import { IaMetricasService } from '../ia-metricas/ia-metricas.service';

const mockCliente = { id: 'cli1', nombre: 'Marca A', organizacionId: 'org1' };
const mockResumen = { desde: '2026-05-01', hasta: '2026-05-31', totales: { impresiones: 1000, publicaciones: 3 }, registros: 10 };
const mockAnalisis = { generacionId: 'gen1', salida: { interpretacion: 'OK', fortalezas: [], oportunidades: [], recomendaciones: [], alertas: [] }, modelo: 'claude', tokens: {} };
const mockInforme = { id: 'inf1', periodo: '202605', clienteId: 'cli1', organizacionId: 'org1', resumenMetricas: mockResumen, analisisIa: mockAnalisis.salida, generacionIaId: 'gen1', creadoEn: new Date(), actualizadoEn: new Date() };

describe('InformesService', () => {
  let service: InformesService;
  let prisma: { cliente: { findFirst: jest.Mock }; informe: { upsert: jest.Mock; count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock } };
  let iaMetricas: { construirResumen: jest.Mock; analizar: jest.Mock };

  beforeEach(async () => {
    prisma = {
      cliente: { findFirst: jest.fn() },
      informe: { upsert: jest.fn(), count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    };
    iaMetricas = { construirResumen: jest.fn(), analizar: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        InformesService,
        { provide: PrismaService, useValue: prisma },
        { provide: IaMetricasService, useValue: iaMetricas },
      ],
    }).compile();

    service = mod.get(InformesService);
  });

  describe('generar', () => {
    it('lanza 404 si el cliente no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      await expect(service.generar('org1', { clienteId: 'cli1' })).rejects.toThrow(NotFoundException);
    });

    it('hace upsert con periodo y analisis', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      iaMetricas.construirResumen.mockResolvedValue(mockResumen);
      iaMetricas.analizar.mockResolvedValue(mockAnalisis);
      prisma.informe.upsert.mockResolvedValue(mockInforme);

      const res = await service.generar('org1', { clienteId: 'cli1', periodo: '202605' });

      expect(prisma.informe.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId_periodo: { clienteId: 'cli1', periodo: '202605' } },
        }),
      );
      expect(res.id).toBe('inf1');
    });

    it('usa mes anterior si no se pasa periodo', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      iaMetricas.construirResumen.mockResolvedValue(mockResumen);
      iaMetricas.analizar.mockResolvedValue(mockAnalisis);
      prisma.informe.upsert.mockResolvedValue(mockInforme);

      await service.generar('org1', { clienteId: 'cli1' });

      const upsertCall = prisma.informe.upsert.mock.calls[0][0];
      expect(upsertCall.where.clienteId_periodo.periodo).toMatch(/^\d{6}$/);
    });
  });

  describe('listar', () => {
    it('pagina correctamente', async () => {
      prisma.informe.count.mockResolvedValue(5);
      prisma.informe.findMany.mockResolvedValue([mockInforme]);
      const res = await service.listar('org1', { pagina: 1, limite: 10 });
      expect(res.total).toBe(5);
      expect(res.items).toHaveLength(1);
    });
  });

  describe('obtener', () => {
    it('lanza 404 si no existe', async () => {
      prisma.informe.findFirst.mockResolvedValue(null);
      await expect(service.obtener('org1', 'inf1')).rejects.toThrow(NotFoundException);
    });
  });
});
