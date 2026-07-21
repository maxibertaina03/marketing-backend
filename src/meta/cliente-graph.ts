/**
 * Cliente de la API de Instagram con **Instagram Login** (la API nueva de Meta).
 * El usuario inicia sesión directo con su Instagram Business/Creator (sin Página de
 * Facebook), autoriza, y con el token leemos sus medios + insights. Solo `fetch`.
 */

const SCOPES_BASE = ['instagram_business_basic', 'instagram_business_manage_insights'];
/**
 * Permiso para publicar. Se pide SOLO si está habilitado por configuración: si la
 * app de Meta todavía no lo tiene activado, pedirlo rompe el login con
 * "Invalid Scopes". Al activarlo, las cuentas ya conectadas deben reconectarse.
 */
const SCOPE_PUBLICAR = 'instagram_business_content_publish';

const AUTORIZAR = 'https://www.instagram.com/oauth/authorize';
const TOKEN_CORTO = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';

export interface TokenLargaDuracion {
  token: string;
  expiraEn: Date | null;
}

export interface PerfilInstagram {
  id: string;
  username: string | null;
}

export interface MedioInstagram {
  id: string;
  caption: string | null;
  tipo: string | null;
  timestamp: string | null;
  permalink: string | null;
  mediaUrl: string | null;
  meGusta: number;
  comentarios: number;
}

export interface InsightsMedio {
  alcance: number;
  impresiones: number;
  guardados: number;
  compartidos: number;
}

export class ClienteGraphMeta {
  private readonly scopes: string;

  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly redirectUri: string,
    permitePublicar = false,
  ) {
    this.scopes = [...SCOPES_BASE, ...(permitePublicar ? [SCOPE_PUBLICAR] : [])].join(',');
  }

  /** URL del diálogo de autorización de Instagram (la abre el usuario para conectar). */
  urlAutorizacion(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes,
      state,
    });
    return `${AUTORIZAR}?${params.toString()}`;
  }

  /** Intercambia el `code` del callback por un token de corta duración + el user id. */
  async intercambiarCodigo(code: string): Promise<{ token: string; userId: string }> {
    const body = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });
    const res = await fetch(TOKEN_CORTO, { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      user_id?: string | number;
      data?: { access_token: string; user_id: string | number }[];
      error_message?: string;
      error_type?: string;
    };
    const token = json.access_token ?? json.data?.[0]?.access_token;
    const userId = json.user_id ?? json.data?.[0]?.user_id;
    if (!res.ok || !token || userId == null) {
      throw new Error(json.error_message ?? `Instagram API respondió ${res.status}`);
    }
    return { token, userId: String(userId) };
  }

  /** Cambia el token de corta duración por uno de larga duración (~60 días). */
  async tokenLargaDuracion(tokenCorto: string): Promise<TokenLargaDuracion> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.appSecret,
      access_token: tokenCorto,
    });
    const json = await this.pedir<{ access_token: string; expires_in?: number }>(
      `${GRAPH}/access_token?${params.toString()}`,
    );
    const expiraEn = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
    return { token: json.access_token, expiraEn };
  }

  /** Perfil de la cuenta de Instagram conectada (id + username). */
  async perfil(token: string): Promise<PerfilInstagram> {
    const json = await this.pedir<{ user_id?: string; id?: string; username?: string }>(
      `${GRAPH}/me?fields=user_id,username&access_token=${token}`,
    );
    return { id: String(json.user_id ?? json.id), username: json.username ?? null };
  }

  /** Últimos medios (posts) de la cuenta, con likes/comentarios. */
  async medios(token: string, limite = 25): Promise<MedioInstagram[]> {
    const campos = 'id,caption,media_type,timestamp,permalink,media_url,like_count,comments_count';
    const json = await this.pedir<{
      data: {
        id: string;
        caption?: string;
        media_type?: string;
        timestamp?: string;
        permalink?: string;
        media_url?: string;
        like_count?: number;
        comments_count?: number;
      }[];
    }>(`${GRAPH}/me/media?fields=${campos}&limit=${limite}&access_token=${token}`);
    return (json.data ?? []).map((m) => ({
      id: m.id,
      caption: m.caption ?? null,
      tipo: m.media_type ?? null,
      timestamp: m.timestamp ?? null,
      permalink: m.permalink ?? null,
      mediaUrl: m.media_url ?? null,
      meGusta: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
    }));
  }

  /**
   * Insights de un medio (alcance, vistas, guardados, compartidos). Las métricas
   * disponibles varían por tipo de medio y versión, así que degrada el pedido si
   * Meta rechaza alguna, devolviendo lo que se pueda.
   */
  async insightsMedio(mediaId: string, token: string): Promise<InsightsMedio> {
    const candidatos = [
      ['reach', 'views', 'saved', 'shares'],
      ['reach', 'saved', 'shares'],
      ['reach', 'saved'],
      ['reach'],
    ];
    for (const metricas of candidatos) {
      try {
        const json = await this.pedir<{ data: { name: string; values: { value: number }[] }[] }>(
          `${GRAPH}/${mediaId}/insights?metric=${metricas.join(',')}&access_token=${token}`,
        );
        const valor = (nombre: string) =>
          json.data?.find((d) => d.name === nombre)?.values?.[0]?.value ?? 0;
        const alcance = valor('reach');
        const vistas = valor('views');
        return {
          alcance,
          impresiones: vistas || alcance,
          guardados: valor('saved'),
          compartidos: valor('shares'),
        };
      } catch {
        // probamos con un set de métricas más reducido
      }
    }
    return { alcance: 0, impresiones: 0, guardados: 0, compartidos: 0 };
  }

  /**
   * Paso 1 de publicar: crea el contenedor con la imagen y el texto. Devuelve el
   * id del contenedor (todavía no está publicado).
   */
  async crearContenedor(
    igUserId: string,
    token: string,
    imagenUrl: string,
    texto: string,
  ): Promise<string> {
    const json = await this.postear<{ id: string }>(`${GRAPH}/${igUserId}/media`, {
      image_url: imagenUrl,
      caption: texto,
      access_token: token,
    });
    return json.id;
  }

  /** Estado del contenedor (`FINISHED` = listo para publicar; relevante en videos). */
  async estadoContenedor(contenedorId: string, token: string): Promise<string> {
    const json = await this.pedir<{ status_code?: string }>(
      `${GRAPH}/${contenedorId}?fields=status_code&access_token=${token}`,
    );
    return json.status_code ?? 'FINISHED';
  }

  /** Paso 2 de publicar: publica el contenedor. Devuelve el id del post en Instagram. */
  async publicarContenedor(igUserId: string, token: string, contenedorId: string): Promise<string> {
    const json = await this.postear<{ id: string }>(`${GRAPH}/${igUserId}/media_publish`, {
      creation_id: contenedorId,
      access_token: token,
    });
    return json.id;
  }

  /** Enlace público del post ya publicado. */
  async permalink(mediaId: string, token: string): Promise<string | null> {
    const json = await this.pedir<{ permalink?: string }>(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${token}`,
    );
    return json.permalink ?? null;
  }

  private async postear<T>(url: string, campos: Record<string, string>): Promise<T> {
    const respuesta = await fetch(url, { method: 'POST', body: new URLSearchParams(campos) });
    const json = (await respuesta.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!respuesta.ok || json.error) {
      throw new Error(json.error?.message ?? `Instagram API respondió ${respuesta.status}`);
    }
    return json;
  }

  private async pedir<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = (await res.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      throw new Error(json.error?.message ?? `Instagram API respondió ${res.status}`);
    }
    return json;
  }
}
