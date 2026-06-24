/**
 * Esquemas de salida (JSON Schema) y tipos TS de los botones de IA de Contenido.
 *
 * Cada botón fuerza una salida estructurada validable: el esquema va como
 * `input_schema` de la herramienta que ejecuta `ServicioIa.generar`, y el tipo
 * TS describe la `salida` ya parseada que vuelve al frontend.
 */

// ── Tipos de salida (lo que devuelve cada botón, ya parseado) ──────────────────

export interface IdeaContenido {
  titulo: string;
  /** Formato sugerido: reel, carrusel, historia, post… */
  formato: string;
  descripcion: string;
  /** Pilar de contenido de la marca al que responde (si aplica). */
  pilar?: string;
}
export interface SalidaIdeas {
  ideas: IdeaContenido[];
}

export interface SalidaHooks {
  hooks: string[];
}

export interface SlideCarrusel {
  titulo: string;
  texto: string;
}
export interface SalidaCarrusel {
  titulo: string;
  slides: SlideCarrusel[];
  pieDeFoto: string;
  hashtags: string[];
}

export interface SalidaCopy {
  texto: string;
  hashtags: string[];
  cta: string;
}

// ── Esquemas JSON (contrato de salida que la IA debe cumplir) ──────────────────

export const ESQUEMA_IDEAS: Record<string, unknown> = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Título corto de la idea.' },
          formato: { type: 'string', description: 'reel, carrusel, historia, post…' },
          descripcion: { type: 'string', description: 'En qué consiste la idea.' },
          pilar: { type: 'string', description: 'Pilar de contenido de la marca (opcional).' },
        },
        required: ['titulo', 'formato', 'descripcion'],
      },
    },
  },
  required: ['ideas'],
};

export const ESQUEMA_HOOKS: Record<string, unknown> = {
  type: 'object',
  properties: {
    hooks: {
      type: 'array',
      description: 'Ganchos de apertura, listos para usar.',
      items: { type: 'string' },
    },
  },
  required: ['hooks'],
};

export const ESQUEMA_CARRUSEL: Record<string, unknown> = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Título del carrusel.' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          texto: { type: 'string' },
        },
        required: ['titulo', 'texto'],
      },
    },
    pieDeFoto: { type: 'string', description: 'Caption del posteo.' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
  required: ['titulo', 'slides', 'pieDeFoto', 'hashtags'],
};

export const ESQUEMA_COPY: Record<string, unknown> = {
  type: 'object',
  properties: {
    texto: { type: 'string', description: 'Copy principal de la publicación.' },
    hashtags: { type: 'array', items: { type: 'string' } },
    cta: { type: 'string', description: 'Llamado a la acción.' },
  },
  required: ['texto', 'hashtags', 'cta'],
};
