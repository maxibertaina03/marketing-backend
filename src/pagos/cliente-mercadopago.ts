import { Logger } from '@nestjs/common';

const API = 'https://api.mercadopago.com';

/** Lo mínimo que usamos de una preferencia creada. */
interface PreferenciaCreada {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

/** Lo mínimo que usamos de un pago consultado. */
export interface PagoMp {
  id: number;
  status: string; // 'approved' | 'pending' | 'rejected' | ...
  external_reference: string;
}

/**
 * Cliente de Mercado Pago por HTTP (sin SDK, igual que el de Meta). Solo lo que
 * necesita Checkout Pro: crear una preferencia de pago y consultar un pago.
 */
export class ClienteMercadoPago {
  private readonly logger = new Logger(ClienteMercadoPago.name);

  constructor(private readonly accessToken: string) {}

  /**
   * Crea una preferencia de checkout y devuelve la URL a la que mandar al usuario.
   * `referencia` (external_reference) es lo que ata el pago a nuestra fila `Pago`.
   */
  async crearPreferencia(datos: {
    titulo: string;
    monto: number;
    moneda: string;
    referencia: string;
    urlRetorno: string;
    urlWebhook: string;
  }): Promise<{ preferenciaId: string; urlCheckout: string }> {
    const cuerpo = {
      items: [
        {
          title: datos.titulo,
          quantity: 1,
          unit_price: datos.monto,
          currency_id: datos.moneda,
        },
      ],
      external_reference: datos.referencia,
      back_urls: {
        success: datos.urlRetorno,
        failure: datos.urlRetorno,
        pending: datos.urlRetorno,
      },
      auto_return: 'approved',
      notification_url: datos.urlWebhook,
    };

    const respuesta = await fetch(`${API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      this.logger.error(`MP crearPreferencia falló (${respuesta.status}): ${detalle}`);
      throw new Error('No se pudo iniciar el pago en Mercado Pago.');
    }

    const pref = (await respuesta.json()) as PreferenciaCreada;
    // En producción `init_point`; con credenciales de prueba, `sandbox_init_point`.
    return { preferenciaId: pref.id, urlCheckout: pref.init_point || pref.sandbox_init_point };
  }

  /** Consulta un pago por id (lo que llega en el webhook). */
  async obtenerPago(pagoId: string): Promise<PagoMp> {
    const respuesta = await fetch(`${API}/v1/payments/${pagoId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      this.logger.error(`MP obtenerPago falló (${respuesta.status}): ${detalle}`);
      throw new Error('No se pudo verificar el pago en Mercado Pago.');
    }
    return (await respuesta.json()) as PagoMp;
  }
}
