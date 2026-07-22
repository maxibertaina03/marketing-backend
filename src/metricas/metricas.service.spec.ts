import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Canal } from '@prisma/client';
import { MetricasService } from './metricas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetricasService', () => {
  let service: MetricasService;
  let prisma: {
    publicacion: { findMany: jest.Mock };
    cliente: { findFirst: jest.Mock };
    metricaPublicacion: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      publicacion: { findMany: jest.fn() },
      cliente: { findFirst: jest.fn() },
      metricaPublicacion: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const modulo = await Test.createTestingModule({
      providers: [MetricasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = modulo.get(MetricasService);
  });

  it('ingestar: resuelve cliente/canal de la publicación y hace upsert por publicación+fecha', async () => {
    prisma.publicacion.findMany.mockResolvedValue([
      { id: 'p1', clienteId: 'c1', canal: Canal.INSTAGRAM },
    ]);

    const res = await service.ingestar('org1', {
      metricas: [{ publicacionId: 'p1', fecha: '2026-06-25', impresiones: 100, meGusta: 10 }],
    });

    expect(res).toEqual({ ingestadas: 1 });
    const arg = prisma.metricaPublicacion.upsert.mock.calls[0][0];
    expect(arg.where.publicacionId_fecha.publicacionId).toBe('p1');
    expect(arg.create).toMatchObject({
      organizacionId: 'org1',
      clienteId: 'c1',
      canal: Canal.INSTAGRAM,
      impresiones: 100,
      meGusta: 10,
      alcance: 0,
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('ingestar: 403 si una publicación no es de la organización (sin transacción)', async () => {
    prisma.publicacion.findMany.mockResolvedValue([]); // ninguna encontrada

    await expect(
      service.ingestar('org1', { metricas: [{ publicacionId: 'ajena', fecha: '2026-06-25' }] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resumen: agrega totales, interacciones, publicaciones, por canal y serie', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.metricaPublicacion.findMany.mockResolvedValue([
      mfila('p1', '2026-06-01', Canal.INSTAGRAM, {
        impresiones: 100,
        alcance: 80,
        meGusta: 10,
        comentarios: 2,
      }),
      // Segunda foto de p1: los valores de Instagram son acumulados, así que crecen.
      mfila('p1', '2026-06-02', Canal.INSTAGRAM, {
        impresiones: 150,
        alcance: 120,
        meGusta: 15,
        comentarios: 3,
      }),
      mfila('p2', '2026-06-02', Canal.FACEBOOK, { impresiones: 30, alcance: 20, compartidos: 4 }),
    ]);

    const r = await service.resumen('org1', { clienteId: 'c1' });

    // Total = última foto de cada publicación (150 de p1 + 30 de p2), no la suma
    // de todas las fotos.
    expect(r.totales.impresiones).toBe(180);
    expect(r.totales.interacciones).toBe(15 + 3 + 4); // últimas fotos: p1 (15+3) + p2 (4)
    expect(r.totales.publicaciones).toBe(2); // p1, p2 distintas
    expect(r.porCanal).toHaveLength(2);
    expect(r.serie.map((s) => s.fecha)).toEqual(['2026-06-01', '2026-06-02']); // ordenada
  });

  it('listar: filtra por tipo de medio (reels vs publicaciones) vía la publicación', async () => {
    prisma.metricaPublicacion.findMany.mockResolvedValue([]);

    await service.listar('org1', { clienteId: 'c1', tipoMedio: 'REELS' });

    expect(prisma.metricaPublicacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizacionId: 'org1',
          clienteId: 'c1',
          publicacion: { tipoMedioMeta: 'REELS' },
        }),
      }),
    );
  });

  describe('valores acumulados de Instagram', () => {
    // Un post con 100 impresiones el día 1 y 200 acumuladas el día 2:
    // el total real es 200 (no 300), y la evolución diaria es 100 y 100.
    const fotos = [
      {
        canal: Canal.INSTAGRAM,
        fecha: new Date('2026-10-01'),
        publicacionId: 'p1',
        impresiones: 100,
        alcance: 80,
        meGusta: 10,
        comentarios: 0,
        compartidos: 0,
        guardados: 0,
        clics: 0,
      },
      {
        canal: Canal.INSTAGRAM,
        fecha: new Date('2026-10-02'),
        publicacionId: 'p1',
        impresiones: 200,
        alcance: 150,
        meGusta: 25,
        comentarios: 0,
        compartidos: 0,
        guardados: 0,
        clics: 0,
      },
    ];

    it('el total es la última foto, no la suma de las fotos', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.metricaPublicacion.findMany.mockResolvedValue(fotos);

      const r = await service.resumen('org1', { clienteId: 'c1' });

      expect(r.totales.impresiones).toBe(200); // no 300
      expect(r.totales.alcance).toBe(150); // no 230
      expect(r.totales.publicaciones).toBe(1);
    });

    it('la serie muestra lo que sumó cada día', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.metricaPublicacion.findMany.mockResolvedValue(fotos);

      const r = await service.resumen('org1', { clienteId: 'c1' });

      expect(r.serie).toEqual([
        expect.objectContaining({ fecha: '2026-10-01', impresiones: 100, alcance: 80 }),
        expect.objectContaining({ fecha: '2026-10-02', impresiones: 100, alcance: 70 }),
      ]);
    });

    it('detalle: devuelve fecha de publicación, total y evolución por publicación', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.metricaPublicacion.findMany.mockResolvedValue(
        fotos.map((f) => ({
          ...f,
          publicacion: {
            titulo: 'Reel de pilates',
            tipoMedioMeta: 'REELS',
            fechaPublicacion: new Date('2026-10-01'),
            fechaProgramada: null,
            imagenUrl: null,
          },
        })),
      );

      const [item] = await service.detalle('org1', { clienteId: 'c1' });

      expect(item.titulo).toBe('Reel de pilates');
      expect(item.tipoMedio).toBe('REELS');
      expect(item.fechaPublicacion).toContain('2026-10-01');
      expect(item.totales.impresiones).toBe(200);
      expect(item.serie.map((d) => d.impresiones)).toEqual([100, 100]);
    });
  });

});

function mfila(publicacionId: string, fecha: string, canal: Canal, vals: Record<string, number>) {
  return {
    publicacionId,
    canal,
    fecha: new Date(fecha),
    impresiones: 0,
    alcance: 0,
    meGusta: 0,
    comentarios: 0,
    compartidos: 0,
    guardados: 0,
    clics: 0,
    ...vals,
  };
}
