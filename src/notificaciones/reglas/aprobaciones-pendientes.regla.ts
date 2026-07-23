import { TipoNotificacion } from '@prisma/client';
import { ReglaNotificacion } from '../tipos';

export const reglaAprobacionesPendientes: ReglaNotificacion = {
  nombre: 'aprobaciones-pendientes',
  descripcion: 'Avisa cuántas publicaciones están esperando aprobación.',

  async evaluar({ organizacionId, prisma }) {
    const pendientes = await prisma.publicacion.count({
      where: { organizacionId, estado: 'EN_REVISION' },
    });
    if (pendientes === 0) return [];
    return [
      {
        tipo: TipoNotificacion.APROBACIONES_PENDIENTES,
        // Clave fija: si hay N pendientes, se actualiza el mismo aviso en lugar
        // de crear uno nuevo por cada cambio en el contador.
        clave: 'aprobaciones-pendientes',
        titulo: `Tenés ${pendientes} ${pendientes === 1 ? 'publicación pendiente' : 'publicaciones pendientes'} de aprobación.`,
        enlace: '/aprobaciones',
      },
    ];
  },
};
