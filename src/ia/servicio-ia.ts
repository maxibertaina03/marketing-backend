import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ResultadoGeneracion, SolicitudGeneracion } from './tipos';
import { ConsumoIaService } from './consumo-ia.service';

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
 * 2. Prompt caching: el contexto de marca va marcado con cache_control. Ojo que
 *    hoy no llega al minimo cacheable del modelo, asi que no ahorra (ver tipos.ts).
 * 3. Persistencia y cuota: cada generación queda registrada y suma al consumo
 *    del período. La cuota del plan se verifica ACÁ, que es el único punto por
 *    el que pasan todos los botones de IA.
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
    private readonly consumo: ConsumoIaService,
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

    // Antes de llamar a Anthropic: si no hay cuota, cortar acá. Verificarlo
    // después sería pagar la generación igual.
    await this.consumo.verificar(solicitud.organizacionId, solicitud.usuarioId);

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
        usuarioId: solicitud.usuarioId ?? null,
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

    const tokens = {
      entrada: uso.input_tokens,
      salida: uso.output_tokens,
      cacheEscritura: uso.cache_creation_input_tokens ?? 0,
      cacheLectura: uso.cache_read_input_tokens ?? 0,
    };
    // El acumulado es lo que se consulta para la cuota. Si fallara, la generación
    // ya está hecha y persistida: se registra el problema y se devuelve igual.
    try {
      await this.consumo.registrar(solicitud.organizacionId, this.modelo, tokens);
    } catch (e) {
      this.logger.error(`No se pudo acumular el consumo de IA: ${String(e)}`);
    }

    return {
      generacionId: generacion.id,
      salida,
      modelo: this.modelo,
      tokens: {
        entrada: tokens.entrada,
        salida: tokens.salida,
        cacheCreacion: tokens.cacheEscritura,
        cacheLectura: tokens.cacheLectura,
      },
    };
  }
}
