import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { TipoBotonIa } from '@prisma/client';
import { ServicioIa } from './servicio-ia';
import type { PrismaService } from '../prisma/prisma.service';
import type { SolicitudGeneracion } from './tipos';

jest.mock('@anthropic-ai/sdk');

describe('ServicioIa', () => {
  const crear = jest.fn();

  beforeEach(() => {
    crear.mockReset();
    (Anthropic as unknown as jest.Mock).mockImplementation(() => ({ messages: { create: crear } }));
  });

  function montar(clave: string) {
    const config = {
      get: (clave2: string) =>
        clave2 === 'ANTHROPIC_API_KEY'
          ? clave
          : clave2 === 'MODELO_IA'
            ? 'claude-opus-4-8'
            : undefined,
    };
    const prisma = {
      generacionIa: { create: jest.fn().mockResolvedValue({ id: 'gen_1' }) },
    };
    const servicio = new ServicioIa(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    return { servicio, prisma };
  }

  const solicitud: SolicitudGeneracion = {
    organizacionId: 'org_1',
    clienteId: 'cli_1',
    tipoBoton: TipoBotonIa.IDEAS_CONTENIDO,
    contextoMarca: 'Marca de café de especialidad, tono cálido.',
    instruccion: 'Dame 3 ideas de reels.',
    esquemaSalida: {
      type: 'object',
      properties: { ideas: { type: 'array', items: { type: 'string' } } },
      required: ['ideas'],
    },
  };

  it('genera salida estructurada, la persiste y mapea los tokens', async () => {
    crear.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [
        { type: 'tool_use', name: 'entregar_resultado', input: { ideas: ['a', 'b', 'c'] } },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 40,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 80,
      },
    });

    const { servicio, prisma } = montar('sk-test');
    const resultado = await servicio.generar<{ ideas: string[] }>(solicitud);

    expect(resultado.salida).toEqual({ ideas: ['a', 'b', 'c'] });
    expect(resultado.generacionId).toBe('gen_1');
    expect(resultado.tokens).toEqual({
      entrada: 100,
      salida: 40,
      cacheCreacion: 0,
      cacheLectura: 80,
    });

    // Persistió la traza con el tipo de botón y el modelo.
    expect(prisma.generacionIa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizacionId: 'org_1',
          tipoBoton: TipoBotonIa.IDEAS_CONTENIDO,
          modelo: 'claude-opus-4-8',
          tokensCacheLectura: 80,
        }),
      }),
    );

    // El contexto de marca va cacheado y se fuerza la herramienta de salida.
    const peticion = crear.mock.calls[0][0];
    expect(peticion.system[1].cache_control).toEqual({ type: 'ephemeral' });
    expect(peticion.tool_choice).toEqual({ type: 'tool', name: 'entregar_resultado' });
  });

  it('falla con 503 si no hay ANTHROPIC_API_KEY configurada', async () => {
    const { servicio } = montar('');
    await expect(servicio.generar(solicitud)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(crear).not.toHaveBeenCalled();
  });
});
