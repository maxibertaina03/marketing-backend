import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ResultadoGeneracion, SolicitudGeneracion } from './tipos';

const MODELO_POR_DEFECTO = 'claude-opus-4-8';
const MAX_TOKENS_POR_DEFECTO = 4096;
const NOMBRE_HERRAMIENTA = 'entregar_resultado';

const SISTEMA_POR_DEFECTO =
  'Sos un estratega de marketing y community manager experto. Generás contenido y estrategia ' +
  'concretos, accionables y fieles a la identidad de cada marca. Respondés SIEMPRE usando la ' +
  'herramienta de salida estructurada provista, sin texto adicional.';

/**
 * Núcleo del Centro de IA. Envuelve el SDK de Anthropic con tres cosas clave:
 *
 * 1. Patrón "botón = salida estructurada": cada llamada fuerza una herramienta
 *    cuyo input_schema es el esquema pedido, así la respuesta es JSON validable.
 * 2. Prompt caching: el contexto de marca (estable y grande) se cachea para
 *    abaratar ~90% las generaciones repetidas de la misma marca.
 * 3. Persistencia: cada generación queda registrada (entrada, salida, modelo,
 *    tokens) para trazabilidad, control de costos y el Banco de Ideas.
 *
 * Los demás módulos de IA (de masita y de capitán) consumen `generar(...)`.
 * NUNCA se llama a la IA desde el front: la API key vive solo acá.
 */
@Injectable()
export class ServicioIa {
  private readonly logger = new Logger(ServicioIa.name);
  private readonly cliente: Anthropic;
  private readonly modelo: string;
  private readonly hayClave: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const clave = this.config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.hayClave = clave.trim().length > 0;
    this.cliente = new Anthropic({ apiKey: clave });
    this.modelo = this.config.get<string>('MODELO_IA') ?? MODELO_POR_DEFECTO;
  }

  /**
   * Ejecuta un "botón" de IA: arma el prompt (sistema + contexto cacheado +
   * instrucción), fuerza la salida estructurada, persiste la traza y devuelve
   * la salida ya parseada.
   */
  async generar<T = unknown>(solicitud: SolicitudGeneracion): Promise<ResultadoGeneracion<T>> {
    if (!this.hayClave) {
      throw new ServiceUnavailableException(
        'La IA no está configurada: falta ANTHROPIC_API_KEY en el entorno del backend.',
      );
    }

    const respuesta = await this.cliente.messages.create({
      model: this.modelo,
      max_tokens: solicitud.maxTokens ?? MAX_TOKENS_POR_DEFECTO,
      // Lo estable primero; el contexto de marca al final, con cache_control.
      system: [
        { type: 'text', text: solicitud.sistema ?? SISTEMA_POR_DEFECTO },
        {
          type: 'text',
          text: solicitud.contextoMarca,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          name: NOMBRE_HERRAMIENTA,
          description: 'Entregá el resultado en el formato estructurado solicitado.',
          input_schema: solicitud.esquemaSalida as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: NOMBRE_HERRAMIENTA },
      messages: [{ role: 'user', content: solicitud.instruccion }],
    });

    const bloque = respuesta.content.find((b) => b.type === 'tool_use');
    if (!bloque || bloque.type !== 'tool_use') {
      this.logger.error(`La IA no devolvió salida estructurada (stop=${respuesta.stop_reason}).`);
      throw new ServiceUnavailableException('La IA no devolvió un resultado válido.');
    }
    const salida = bloque.input as T;

    const uso = respuesta.usage;
    const generacion = await this.prisma.generacionIa.create({
      data: {
        organizacionId: solicitud.organizacionId,
        clienteId: solicitud.clienteId ?? null,
        estrategiaId: solicitud.estrategiaId ?? null,
        tipoBoton: solicitud.tipoBoton,
        instruccion: solicitud.instruccion,
        salida: salida as Prisma.InputJsonValue,
        modelo: this.modelo,
        tokensEntrada: uso.input_tokens,
        tokensSalida: uso.output_tokens,
        tokensCacheCreacion: uso.cache_creation_input_tokens ?? 0,
        tokensCacheLectura: uso.cache_read_input_tokens ?? 0,
      },
    });

    return {
      generacionId: generacion.id,
      salida,
      modelo: this.modelo,
      tokens: {
        entrada: uso.input_tokens,
        salida: uso.output_tokens,
        cacheCreacion: uso.cache_creation_input_tokens ?? 0,
        cacheLectura: uso.cache_read_input_tokens ?? 0,
      },
    };
  }
}
