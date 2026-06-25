import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { IaMetricasService } from './ia-metricas.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';

const mockCliente = { id: 'cli1', nombre: 'Marca A', rubro: 'Retail', organizacionId: 'org1' };
const mockMetricas = [
  { id: 'm1', publicacionId: 'pub1', canal: 'INSTAGRAM', impresiones: 1000, alcance: 800, meGusta: 50, comentarios: 10, compartidos: 5, guardados: 20, clics: 30 },
  { id: 'm2', publicacionId: 'pub2', canal: 'FACEBOOK', impresiones: 500, alcance: 400, meGusta: 20, comentarios: 5, compartidos: 2, guardados: 8, clics: 15 },
];

const mockGeneracion = { generacionId: 'gen1', salida: { interpretacion: 'Buenas métricas', fortalezas: [], oportunidades: [], recomendaciones: [], alertas: [] }, modelo: 'claude', tokens: {} };

describe('IaMetricasService', () => {
  let service: IaMetricasService;
  let prisma: { cliente: { findFirst: jest.Mock }; estrategiaDeMarca: { findFirst: jest.Mock }; metricaPublicacion: { findMany: jest.Mock }; generacionIa: { count: jest.Mock; findMany: jest.Mock } };
  let servicioIa: { generar: jest.Mock };

  beforeEach(async () => {
    prisma = {
      cliente: { findFirst: jest.fn() },
      estrategiaDeMarca: { findFirst: jest.fn() },
      metricaPublicacion: { findMany: jest.fn() },
      generacionIa: { count: jest.fn(), findMany: jest.fn() },
    };
    servicioIa = { generar: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        IaMetricasService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServicioIa, useValue: servicioIa },
      ],
    }).compile();

    service = mod.get(IaMetricasService);
  });

  describe('analizar', () => {
    it('lanza 404 si el cliente no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      await expect(service.analizar('org1', { clienteId: 'cli1' })).rejects.toThrow(NotFoundException);
    });

    it('llama a ServicioIa con tipoBoton ANALISIS_METRICAS', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue(mockMetricas);
      servicioIa.generar.mockResolvedValue(mockGeneracion);

      await service.analizar('org1', { clienteId: 'cli1' });

      expect(servicioIa.generar).toHaveBeenCalledWith(
        expect.objectContaining({ tipoBoton: TipoBotonIa.ANALISIS_METRICAS, clienteId: 'cli1' }),
      );
    });

    it('incluye totales agregados en el contextoMarca', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue(mockMetricas);
      servicioIa.generar.mockResolvedValue(mockGeneracion);

      await service.analizar('org1', { clienteId: 'cli1' });

      const llamada = servicioIa.generar.mock.calls[0][0];
      expect(llamada.contextoMarca).toMatch(/1[.,]?500/); // impresiones totales (locale-agnostic)
      expect(llamada.contextoMarca).toContain('INSTAGRAM');
    });

    it('funciona sin metricas (contexto vacío)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue([]);
      servicioIa.generar.mockResolvedValue(mockGeneracion);
      await expect(service.analizar('org1', { clienteId: 'cli1' })).resolves.toBeDefined();
    });
  });

  describe('historial', () => {
    it('filtra por ANALISIS_METRICAS y pagina', async () => {
      prisma.generacionIa.count.mockResolvedValue(5);
      prisma.generacionIa.findMany.mockResolvedValue([]);
      const res = await service.historial('org1', { pagina: 2, limite: 10 });
      expect(res.pagina).toBe(2);
      expect(prisma.generacionIa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tipoBoton: TipoBotonIa.ANALISIS_METRICAS }) }),
      );
    });
  });

  describe('construirResumen', () => {
    it('agrega métricas correctamente', async () => {
      prisma.metricaPublicacion.findMany.mockResolvedValue(mockMetricas);
      const res = await service.construirResumen('org1', 'cli1', new Date('2026-06-01'), new Date('2026-06-30'));
      expect(res.totales.impresiones).toBe(1500);
      expect(res.totales.interacciones).toBe(120); // 50+10+5+20 + 20+5+2+8
      expect(res.totales.publicaciones).toBe(2);
    });
  });
});
