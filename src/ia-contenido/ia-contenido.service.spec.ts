import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { IaContenidoService } from './ia-contenido.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';

describe('IaContenidoService', () => {
  let service: IaContenidoService;
  let prisma: {
    cliente: { findFirst: jest.Mock };
    generacionIa: { count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let servicioIa: { generar: jest.Mock };

  const clienteConEstrategia = {
    id: 'cli_1',
    nombre: 'Café del Centro',
    rubro: 'Gastronomía',
    descripcion: null,
    publicoObjetivo: 'Adultos 25-40',
    tono: 'Cálido',
    productosServicios: null,
    objetivos: null,
    competencia: null,
    promociones: null,
    estrategias: [
      {
        id: 'est_1',
        nombre: 'Plan Q3',
        objetivo: 'Aumentar reservas de fin de semana',
        publicoObjetivo: 'Amantes del café de especialidad',
        tono: 'CERCANO',
        pilares: ['Educación', 'Detrás de escena'],
        restricciones: null,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      cliente: { findFirst: jest.fn() },
      generacionIa: { count: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    servicioIa = {
      generar: jest.fn().mockResolvedValue({
        generacionId: 'gen_1',
        salida: {},
        modelo: 'claude-opus-4-8',
        tokens: {},
      }),
    };

    const modulo = await Test.createTestingModule({
      providers: [
        IaContenidoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServicioIa, useValue: servicioIa },
      ],
    }).compile();

    service = modulo.get(IaContenidoService);
  });

  it('arma el contexto de marca + estrategia y delega en ServicioIa con el esquema correcto', async () => {
    prisma.cliente.findFirst.mockResolvedValue(clienteConEstrategia);

    await service.generarIdeas('org_1', 'user_1', {
      clienteId: 'cli_1',
      cantidad: 3,
      tema: 'café de especialidad',
    });

    // Multi-tenant: el cliente se busca acotado a la organización del contexto.
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cli_1', organizacionId: 'org_1' } }),
    );

    const arg = servicioIa.generar.mock.calls[0][0];
    expect(arg.tipoBoton).toBe(TipoBotonIa.IDEAS_CONTENIDO);
    expect(arg.organizacionId).toBe('org_1');
    expect(arg.estrategiaId).toBe('est_1');
    expect(arg.esquemaSalida).toMatchObject({ type: 'object', required: ['ideas'] });
    expect(arg.contextoMarca).toContain('Café del Centro');
    expect(arg.contextoMarca).toContain('Pilares de contenido: Educación, Detrás de escena');
    expect(arg.instruccion).toContain('3 ideas');
  });

  it('lanza 404 si el cliente no pertenece a la organización (y no llama a la IA)', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);

    await expect(
      service.generarCopy('org_1', 'user_1', { clienteId: 'ajeno', brief: 'promo 2x1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(servicioIa.generar).not.toHaveBeenCalled();
  });

  it('lanza 404 si se pide una estrategia inexistente para el cliente', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ ...clienteConEstrategia, estrategias: [] });

    await expect(
      service.generarHooks('org_1', 'user_1', {
        clienteId: 'cli_1',
        tema: 'tostado',
        estrategiaId: 'no_existe',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(servicioIa.generar).not.toHaveBeenCalled();
  });

  it('biblioteca: filtra por organización y por los tipos de contenido por defecto (paginado)', async () => {
    prisma.$transaction.mockResolvedValue([2, [{ id: 'gen_1' }, { id: 'gen_2' }]]);

    const res = await service.listarBiblioteca('org_1', {});

    expect(prisma.generacionIa.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizacionId: 'org_1',
        tipoBoton: {
          in: [
            TipoBotonIa.IDEAS_CONTENIDO,
            TipoBotonIa.HOOKS,
            TipoBotonIa.CARRUSEL,
            TipoBotonIa.COPYWRITING,
          ],
        },
      }),
    });
    expect(res).toEqual({
      total: 2,
      pagina: 1,
      limite: 20,
      items: [{ id: 'gen_1' }, { id: 'gen_2' }],
    });
  });
});
