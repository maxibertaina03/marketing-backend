/**
 * Cliente mínimo de la Graph API de Meta (Facebook/Instagram). Encapsula el OAuth
 * (Facebook Login) y la lectura de medios + insights de una cuenta de Instagram
 * Business. No usa SDK: solo `fetch` (Node 20+). Todas las llamadas son de lectura.
 */

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',');

export interface TokenLargaDuracion {
  token: string;
  expiraEn: Date | null;
}

export interface PaginaFacebook {
  id: string;
  nombre: string;
  accessToken: string;
}

export interface CuentaInstagram {
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
  private readonly base: string;
  private readonly dialogo: string;

  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly redirectUri: string,
    version = 'v21.0',
  ) {
    this.base = `https://graph.facebook.com/${version}`;
    this.dialogo = `https://www.facebook.com/${version}/dialog/oauth`;
  }

  /** URL del diálogo de autorización de Facebook (la abre el usuario para conectar). */
  urlAutorizacion(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope: SCOPES,
      response_type: 'code',
    });
    return `${this.dialogo}?${params.toString()}`;
  }

  /** Intercambia el `code` del callback por un token de usuario de corta duración. */
  async intercambiarCodigo(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: this.redirectUri,
      code,
    });
    const json = await this.pedir<{ access_token: string }>(
      `${this.base}/oauth/access_token?${params.toString()}`,
    );
    return json.access_token;
  }

  /** Cambia un token de corta duración por uno de larga duración (~60 días). */
  async tokenLargaDuracion(tokenCorto: string): Promise<TokenLargaDuracion> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: tokenCorto,
    });
    const json = await this.pedir<{ access_token: string; expires_in?: number }>(
      `${this.base}/oauth/access_token?${params.toString()}`,
    );
    const expiraEn = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
    return { token: json.access_token, expiraEn };
  }

  /** Páginas de Facebook que administra el usuario (con su token de Página). */
  async paginas(tokenUsuario: string): Promise<PaginaFacebook[]> {
    const json = await this.pedir<{
      data: { id: string; name: string; access_token: string }[];
    }>(`${this.base}/me/accounts?fields=id,name,access_token&access_token=${tokenUsuario}`);
    return (json.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.name,
      accessToken: p.access_token,
    }));
  }

  /** Cuenta de Instagram Business vinculada a una Página (o null si no tiene). */
  async cuentaInstagram(pageId: string, tokenPagina: string): Promise<CuentaInstagram | null> {
    const json = await this.pedir<{
      instagram_business_account?: { id: string; username?: string };
    }>(
      `${this.base}/${pageId}?fields=instagram_business_account{id,username}&access_token=${tokenPagina}`,
    );
    const ig = json.instagram_business_account;
    return ig ? { id: ig.id, username: ig.username ?? null } : null;
  }

  /** Últimos medios (posts) de la cuenta de Instagram, con likes/comentarios. */
  async medios(igUserId: string, tokenPagina: string, limite = 25): Promise<MedioInstagram[]> {
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
    }>(
      `${this.base}/${igUserId}/media?fields=${campos}&limit=${limite}&access_token=${tokenPagina}`,
    );
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
   * Insights de un medio (alcance, impresiones/vistas, guardados, compartidos).
   * Las métricas disponibles varían por tipo de medio y versión de API, así que
   * degrada el pedido si Meta rechaza alguna métrica, devolviendo lo que se pueda.
   */
  async insightsMedio(mediaId: string, tokenPagina: string): Promise<InsightsMedio> {
    const candidatos = [
      ['reach', 'views', 'saved', 'shares'],
      ['reach', 'saved', 'shares'],
      ['reach', 'saved'],
      ['reach'],
    ];
    for (const metricas of candidatos) {
      try {
        const json = await this.pedir<{ data: { name: string; values: { value: number }[] }[] }>(
          `${this.base}/${mediaId}/insights?metric=${metricas.join(',')}&access_token=${tokenPagina}`,
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

  private async pedir<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = (await res.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      throw new Error(json.error?.message ?? `Meta API respondió ${res.status}`);
    }
    return json;
  }
}
