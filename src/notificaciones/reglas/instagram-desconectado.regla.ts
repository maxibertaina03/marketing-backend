import { TipoNotificacion } from '@prisma/client';
import { ReglaNotificacion } from '../tipos';

/** Con menos de esto para vencer, ya conviene avisar. */
const DIAS_DE_AVISO = 7;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Avisa cuando el token de Instagram de una marca venció o está por vencer.
 *
 * Importa porque el vencimiento es silencioso: sin aviso, las métricas dejan de
 * actualizarse y el auto-posteo falla sin que nadie se entere hasta que alguien
 * mira el dashboard y lo ve congelado.
 */
export const reglaInstagramDesconectado: ReglaNotificacion = {
  nombre: 'instagram-desconectado',
  descripcion: 'Avisa si el token de Instagram de una marca venció o vence en menos de 7 días.',

  async evaluar({ organizacionId, prisma, hoy }) {
    const limite = new Date(hoy.getTime() + DIAS_DE_AVISO * UN_DIA_MS);

    const conexiones = await prisma.conexionMeta.findMany({
      where: { organizacionId, tokenExpiraEn: { not: null, lte: limite } },
      select: {
        clienteId: true,
        igUsername: true,
        tokenExpiraEn: true,
        cliente: { select: { nombre: true } },
      },
    });

    return conexiones.map((conexion) => {
      const marca = conexion.cliente.nombre;
      const vencido = conexion.tokenExpiraEn !== null && conexion.tokenExpiraEn <= hoy;

      return {
        tipo: TipoNotificacion.INSTAGRAM_DESCONECTADO,
        // Una por marca: mientras siga sin renovarse, se refresca el mismo aviso.
        clave: `instagram-desconectado:${conexion.clienteId}`,
        titulo: vencido
          ? `El Instagram de ${marca} se desconectó.`
          : `El Instagram de ${marca} está por desconectarse.`,
        cuerpo: vencido
          ? 'Sus métricas dejaron de actualizarse. Volvé a conectarlo desde la ficha del cliente.'
          : 'El permiso vence en los próximos días. Reconectalo para no perder las métricas.',
        enlace: `/clientes/${conexion.clienteId}`,
      };
    });
  },
};
