import type { TipoBotonIa } from '@prisma/client';

/**
 * CONTRATO DEL MÓDULO IA (Fase 2).
 *
 * Cada "botón" del Centro de IA llama a `ServicioIa.generar(...)` con:
 * - el contexto estable de la marca (se cachea con prompt caching),
 * - una instrucción puntual (qué genera ese botón),
 * - y el esquema JSON de la salida estructurada.
 *
 * Devuelve la salida ya parseada + metadatos (tokens, modelo, id de la traza).
 * No es un chat: una llamada = una respuesta estructurada y validable.
 */
export interface SolicitudGeneracion {
  /** Organización (tenant) dueña de la generación. Obligatorio. */
  organizacionId: string;
  /** Cliente/marca para el que se genera (opcional, para trazabilidad). */
  clienteId?: string;
  /** Estrategia asociada (opcional). */
  estrategiaId?: string;
  /** Qué botón originó esta generación. */
  tipoBoton: TipoBotonIa;

  /**
   * Contexto ESTABLE de la marca (estrategia, base de conocimiento, tono…).
   * Es grande y se reusa entre muchas generaciones de la misma marca:
   * va al final del system y se cachea (cache_control) para ahorrar ~90%.
   */
  contextoMarca: string;

  /** Instrucción VARIABLE: qué se quiere generar en esta llamada concreta. */
  instruccion: string;

  /**
   * Esquema JSON (JSON Schema) de la salida esperada. Debe ser un objeto
   * con `type: "object"`, `properties` y `required`. La IA responde un JSON
   * que cumple este esquema (vía structured output con tool).
   */
  esquemaSalida: Record<string, unknown>;

  /** System prompt opcional (rol del asistente). Si falta, se usa uno por defecto. */
  sistema?: string;

  /** Tope de tokens de salida (default configurable). */
  maxTokens?: number;
}

/** Tokens consumidos por una generación (para control de costos). */
export interface TokensGeneracion {
  entrada: number;
  salida: number;
  cacheCreacion: number;
  cacheLectura: number;
}

/** Resultado de una generación: la salida estructurada + metadatos. */
export interface ResultadoGeneracion<T = unknown> {
  /** Id de la fila GeneracionIa persistida (trazabilidad / Banco de Ideas). */
  generacionId: string;
  /** Salida ya parseada según `esquemaSalida`. */
  salida: T;
  /** Modelo usado (ej. claude-opus-4-8). */
  modelo: string;
  tokens: TokensGeneracion;
}
