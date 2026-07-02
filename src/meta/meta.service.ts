import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Canal, EstadoContenido } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClienteGraphMeta } from './cliente-graph';

/** Datos que viajan firmados en el `state` del OAuth (sobreviven al redirect). */
interface EstadoOAuth {
  organizacionId: string;
  clienteId: string;
  ts: number;
}

const VENTANA_STATE_MS = 15 * 60 * 1000; // el state es válido 15 minutos

/**
 * Integración con Meta (Instagram Login). Maneja el OAuth (conectar la cuenta de
 * Instagram Business de un cliente) y la sincronización de métricas reales hacia
 * `MetricaPublicacion` (el modelo que usa el Dashboard y la IA de Métricas).
 * Multi-tenant.
 */
@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly appSecret: string;
  private readonly frontendUrl: string;
  private readonly graph: ClienteGraphMeta | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const appId = config.get<string>('META_IG_APP_ID') ?? '';
    this.appSecret = config.get<string>('META_IG_APP_SECRET') ?? '';
    const redirectUri = config.get<string>('META_REDIRECT_URI') ?? '';
    this.frontendUrl = config.get<string>('ORIGEN_FRONTEND') ?? '';
    this.graph =
      appId && this.appSecret && redirectUri
        ? new ClienteGraphMeta(appId, this.appSecret, redirectUri)
        : null;
  }

  /** Paso 1: devuelve la URL de autorización de Instagram para conectar el cliente. */
  async iniciarConexion(organizacionId: string, clienteId: string) {
    const graph = this.exigirGraph();
    await this.verificarCliente(organizacionId, clienteId);
    const state = this.firmarEstado({ organizacionId, clienteId, ts: Date.now() });
    return { url: graph.urlAutorizacion(state) };
  }

  /**
   * Paso 2: Instagram redirige acá con `code` + `state`. Intercambia el token,
   * resuelve el perfil de Instagram y guarda la conexión. Devuelve la URL del front
   * a la que volver (la ficha del cliente, con el resultado).
   */
  async procesarCallback(code?: string, state?: string, error?: string): Promise<string> {
    if (error || !code || !state) return this.urlResultado(null, 'meta=error');

    let datos: EstadoOAuth;
    try {
      datos = this.verificarEstado(state);
    } catch {
      return this.urlResultado(null, 'meta=error');
    }

    try {
      const graph = this.exigirGraph();
      const corto = await graph.intercambiarCodigo(code);
      const largo = await graph.tokenLargaDuracion(corto.token);
      const perfil = await graph.perfil(largo.token);

      const datosConexion = {
        pageId: null,
        pageNombre: null,
        accessToken: largo.token,
        igUserId: perfil.id || corto.userId,
        igUsername: perfil.username,
        tokenExpiraEn: largo.expiraEn,
      };
      await this.prisma.conexionMeta.upsert({
        where: { clienteId: datos.clienteId },
        create: {
          organizacionId: datos.organizacionId,
          clienteId: datos.clienteId,
          ...datosConexion,
        },
        update: datosConexion,
      });
      return this.urlResultado(datos.clienteId, 'meta=conectado');
    } catch (e) {
      this.logger.error(`Callback de Meta falló: ${e instanceof Error ? e.message : e}`);
      return this.urlResultado(datos.clienteId, 'meta=error');
    }
  }

  /** Estado de la conexión de un cliente (para mostrar en la ficha). */
  async estado(organizacionId: string, clienteId: string) {
    await this.verificarCliente(organizacionId, clienteId);
    const conexion = await this.prisma.conexionMeta.findFirst({
      where: { clienteId, organizacionId },
      select: { igUsername: true, ultimaSync: true, tokenExpiraEn: true },
    });
    if (!conexion) return { conectado: false };
    return { conectado: true, ...conexion };
  }

  /** Desconecta (borra) la conexión de Meta de un cliente. */
  async desconectar(organizacionId: string, clienteId: string) {
    await this.verificarCliente(organizacionId, clienteId);
    await this.prisma.conexionMeta.deleteMany({ where: { clienteId, organizacionId } });
    return { conectado: false };
  }

  /**
   * Trae los últimos medios de Instagram del cliente y guarda sus métricas como
   * snapshot de hoy en `MetricaPublicacion`. Crea una `Publicacion` por cada medio
   * que no exista todavía (vinculada por `metaMediaId`).
   */
  async sincronizar(organizacionId: string, clienteId: string) {
    const graph = this.exigirGraph();
    await this.verificarCliente(organizacionId, clienteId);
    const conexion = await this.prisma.conexionMeta.findFirst({
      where: { clienteId, organizacionId },
    });
    if (!conexion) {
      throw new BadRequestException('Este cliente no tiene Instagram conectado.');
    }

    const medios = await graph.medios(conexion.accessToken);
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    let sincronizadas = 0;
    for (const medio of medios) {
      const publicacion = await this.publicacionDeMedio(organizacionId, clienteId, medio);
      const insights = await graph.insightsMedio(medio.id, conexion.accessToken);
      const valores = {
        impresiones: insights.impresiones,
        alcance: insights.alcance,
        meGusta: medio.meGusta,
        comentarios: medio.comentarios,
        compartidos: insights.compartidos,
        guardados: insights.guardados,
        clics: 0,
      };
      await this.prisma.metricaPublicacion.upsert({
        where: { publicacionId_fecha: { publicacionId: publicacion.id, fecha: hoy } },
        update: valores,
        create: {
          organizacionId,
          clienteId,
          publicacionId: publicacion.id,
          canal: Canal.INSTAGRAM,
          fecha: hoy,
          ...valores,
        },
      });
      sincronizadas++;
    }

    await this.prisma.conexionMeta.update({
      where: { id: conexion.id },
      data: { ultimaSync: new Date() },
    });
    return { medios: medios.length, sincronizadas };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /** Busca la publicación vinculada al medio de Instagram o la crea. */
  private async publicacionDeMedio(
    organizacionId: string,
    clienteId: string,
    medio: {
      id: string;
      caption: string | null;
      timestamp: string | null;
      permalink: string | null;
      mediaUrl: string | null;
    },
  ) {
    const existente = await this.prisma.publicacion.findFirst({
      where: { clienteId, metaMediaId: medio.id },
      select: { id: true },
    });
    if (existente) return existente;
    const titulo = (medio.caption?.trim().slice(0, 80) || 'Publicación de Instagram').replace(
      /\n/g,
      ' ',
    );
    return this.prisma.publicacion.create({
      data: {
        organizacionId,
        clienteId,
        metaMediaId: medio.id,
        titulo,
        contenido: medio.caption ?? '',
        canal: Canal.INSTAGRAM,
        estado: EstadoContenido.PUBLICADO,
        imagenUrl: medio.mediaUrl ?? medio.permalink,
        fechaProgramada: medio.timestamp ? new Date(medio.timestamp) : null,
      },
      select: { id: true },
    });
  }

  private exigirGraph(): ClienteGraphMeta {
    if (!this.graph) {
      throw new ServiceUnavailableException(
        'La integración con Meta no está configurada (faltan credenciales).',
      );
    }
    return this.graph;
  }

  private async verificarCliente(organizacionId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('El cliente no pertenece a esta organización.');
  }

  private urlResultado(clienteId: string | null, query: string): string {
    const destino = clienteId ? `/clientes/${clienteId}` : '/clientes';
    return `${this.frontendUrl}${destino}?${query}`;
  }

  private firmarEstado(payload: EstadoOAuth): string {
    const datos = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const firma = createHmac('sha256', this.appSecret).update(datos).digest('base64url');
    return `${datos}.${firma}`;
  }

  private verificarEstado(state: string): EstadoOAuth {
    const [datos, firma] = state.split('.');
    if (!datos || !firma) throw new ForbiddenException('state inválido');
    const esperada = createHmac('sha256', this.appSecret).update(datos).digest('base64url');
    if (firma !== esperada) throw new ForbiddenException('state inválido');
    const payload = JSON.parse(Buffer.from(datos, 'base64url').toString()) as EstadoOAuth;
    if (Date.now() - payload.ts > VENTANA_STATE_MS) {
      throw new ForbiddenException('state vencido');
    }
    return payload;
  }
}
