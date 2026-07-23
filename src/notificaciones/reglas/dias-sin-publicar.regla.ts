import { TipoNotificacion } from '@prisma/client';
import { ReglaNotificacion } from '../tipos';

const UMBRAL_DIAS = 5;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export const reglaDiasSinPublicar: ReglaNotificacion = {
  nombre: 'dias-sin-publicar',
  descripcion: `Avisa por cada cliente que lleva más de ${UMBRAL_DIAS} días sin publicaciones.`,

  async evaluar({ organizacionId, prisma, hoy }) {
    const limite = new Date(hoy.getTime() - UMBRAL_DIAS * UN_DIA_MS);

    // Por cada cliente, la publicación PUBLICADO más reciente.
    // Si un cliente no tiene ninguna, se excluye (no queremos alertas sobre marcas nuevas).
    const clientes = await prisma.cliente.findMany({
      where: { organizacionId },
      select: {
        id: true,
        nombre: true,
        publicaciones: {
          where: { estado: 'PUBLICADO' },
          orderBy: { actualizadoEn: 'desc' },
          take: 1,
          select: { actualizadoEn: true },
        },
      },
    });

    const avisos = [];
    for (const cliente of clientes) {
      const ultima = cliente.publicaciones[0];
      if (!ultima || ultima.actualizadoEn > limite) continue;

      const dias = Math.floor((hoy.getTime() - ultima.actualizadoEn.getTime()) / UN_DIA_MS);
      avisos.push({
        tipo: TipoNotificacion.DIAS_SIN_PUBLICAR,
        // Una por marca: mientras la situación persista, el aviso se refresca.
        clave: `dias-sin-publicar:${cliente.id}`,
        titulo: `Hace ${dias} ${dias === 1 ? 'día' : 'días'} que no publicás para ${cliente.nombre}.`,
        enlace: '/calendario',
      });
    }
    return avisos;
  },
};
