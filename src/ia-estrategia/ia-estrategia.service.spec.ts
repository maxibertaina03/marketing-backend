import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { IaEstrategiaService } from './ia-estrategia.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';

const mockCliente = {
  id: 'cli1',
  nombre: 'Marca Test',
  rubro: 'Moda',
  organizacionId: 'org1',
  descripcion: 'Ropa sustentable',
  ubicacion: null,
  publicoObjetivo: 'Mujeres 25-40',
  tono: 'Cercano',
  productosServicios: null,
  objetivos: 'Aumentar ventas',
  competencia: null,
  promociones: null,
};

const mockMetricas = [
  { canal: 'INSTAGRAM', fecha: new Date(), impresiones: 2000, alcance: 1500, meGusta: 120, comentarios: 30, compartidos: 10, guardados: 50, clics: 40 },
];

const mockSalida = {
  generacionId: 'gen1',
  salida: { resumen: 'Buen momento para crecer', oportunidades: [] },
  modelo: 'claude',
  tokens: {},
};

describe('IaEstrategiaService', () => {
  let service: IaEstrategiaService;
  let prisma: {
    cliente: { findFirst: jest.Mock };
    estrategiaDeMarca: { findFirst: jest.Mock };
    metricaPublicacion: { findMany: jest.Mock };
    generacionIa: { count: jest.Mock; findMany: jest.Mock };
  };
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
        IaEstrategiaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServicioIa, useValue: servicioIa },
      ],
    }).compile();

    service = mod.get(IaEstrategiaService);
  });

  describe('generarOportunidades', () => {
    it('lanza 404 si el cliente no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      await expect(service.generarOportunidades('org1', { clienteId: 'cli1' })).rejects.toThrow(NotFoundException);
    });

    it('llama a ServicioIa con tipoBoton OPORTUNIDADES', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue(mockMetricas);
      servicioIa.generar.mockResolvedValue(mockSalida);

      await service.generarOportunidades('org1', { clienteId: 'cli1' });

      expect(servicioIa.generar).toHaveBeenCalledWith(
        expect.objectContaining({ tipoBoton: TipoBotonIa.OPORTUNIDADES, clienteId: 'cli1' }),
      );
    });

    it('incluye métricas reales en el contextoMarca cuando hay datos', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue(mockMetricas);
      servicioIa.generar.mockResolvedValue(mockSalida);

      await service.generarOportunidades('org1', { clienteId: 'cli1' });

      const llamada = servicioIa.generar.mock.calls[0][0];
      expect(llamada.contextoMarca).toContain('MÉTRICAS REALES');
      expect(llamada.contextoMarca).toContain('INSTAGRAM');
    });

    it('indica "sin datos" en el contexto cuando no hay métricas', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.metricaPublicacion.findMany.mockResolvedValue([]);
      servicioIa.generar.mockResolvedValue(mockSalida);

      await service.generarOportunidades('org1', { clienteId: 'cli1' });

      const llamada = servicioIa.generar.mock.calls[0][0];
      expect(llamada.contextoMarca).toContain('Sin datos de métricas');
    });
  });
});
