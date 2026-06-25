import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';
import { AnalizarMetricasDto } from './dto/analizar-metricas.dto';

export interface SalidaAnalisisMetricas {
  interpretacion: string;
  fortalezas: string[];
  oportunidades: string[];
  recomendaciones: string[];
  alertas: string[];
}

const ESQUEMA_ANALISIS = {
  type: 'object',
  properties: {
    interpretacion: { type: 'string' },
    fortalezas: { type: 'array', items: { type: 'string' } },
    oportunidades: { type: 'array', items: { type: 'string' } },
    recomendaciones: { type: 'array', items: { type: 'string' } },
    alertas: { type: 'array', items: { type: 'string' } },
  },
  required: ['interpretacion', 'fortalezas', 'oportunidades', 'recomendaciones', 'alertas'],
};

@Injectable()
export class IaMetricasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicioIa: ServicioIa,
  ) {}

  async analizar(organizacionId: string, dto: AnalizarMetricasDto) {
    const { clienteId, estrategiaId, desde, hasta } = dto;

    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, organizacionId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const estrategia = estrategiaId
      ? await this.prisma.estrategiaDeMarca.findFirst({ where: { id: estrategiaId, organizacionId } })
      : null;

    const fechaDesde = desde ? new Date(desde) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fechaHasta = hasta ? new Date(hasta) : new Date();

    const metricas = await this.prisma.metricaPublicacion.findMany({
      where: { clienteId, organizacionId, fecha: { gte: fechaDesde, lte: fechaHasta } },
    });

    const totales = metricas.reduce(
      (acc, m) => ({
        impresiones: acc.impresiones + m.impresiones,
        alcance: acc.alcance + m.alcance,
        interacciones: acc.interacciones + m.meGusta + m.comentarios + m.compartidos + m.guardados,
        clics: acc.clics + m.clics,
      }),
      { impresiones: 0, alcance: 0, interacciones: 0, clics: 0 },
    );

    const porCanal = Object.entries(
      metricas.reduce<Record<string, { impresiones: number; interacciones: number }>>(
        (acc, m) => {
          if (!acc[m.canal]) acc[m.canal] = { impresiones: 0, interacciones: 0 };
          acc[m.canal].impresiones += m.impresiones;
          acc[m.canal].interacciones += m.meGusta + m.comentarios + m.compartidos + m.guardados;
          return acc;
        },
        {},
      ),
    )
      .map(([canal, vals]) => ({ canal, ...vals }))
      .sort((a, b) => b.impresiones - a.impresiones);

    const periodoTexto = `${fechaDesde.toISOString().split('T')[0]} al ${fechaHasta.toISOString().split('T')[0]}`;

    const contextoMarca = [
      `Cliente: ${cliente.nombre}`,
      cliente.rubro ? `Rubro: ${cliente.rubro}` : '',
      estrategia ? `Estrategia activa: ${estrategia.nombre} — Objetivo: ${estrategia.objetivo}` : '',
      `\nMétricas del período ${periodoTexto} (${metricas.length} snapshots):`,
      `- Impresiones totales: ${totales.impresiones.toLocaleString()}`,
      `- Alcance total: ${totales.alcance.toLocaleString()}`,
      `- Interacciones totales: ${totales.interacciones.toLocaleString()}`,
      `- Clics totales: ${totales.clics.toLocaleString()}`,
      `- Tasa de engagement: ${totales.alcance > 0 ? ((totales.interacciones / totales.alcance) * 100).toFixed(2) : 0}%`,
      porCanal.length > 0
        ? `\nDesglose por canal:\n${porCanal.map((c) => `  ${c.canal}: ${c.impresiones.toLocaleString()} impresiones, ${c.interacciones.toLocaleString()} interacciones`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.servicioIa.generar<SalidaAnalisisMetricas>({
      organizacionId,
      clienteId,
      estrategiaId: estrategiaId ?? undefined,
      tipoBoton: TipoBotonIa.ANALISIS_METRICAS,
      contextoMarca,
      instruccion:
        'Analizá las métricas del período e identificá fortalezas, oportunidades, recomendaciones accionables y alertas de bajo rendimiento.',
      esquemaSalida: ESQUEMA_ANALISIS,
    });
  }

  async historial(organizacionId: string, filtros: { clienteId?: string; pagina?: number; limite?: number }) {
    const { clienteId, pagina = 1, limite = 20 } = filtros;
    const skip = (pagina - 1) * limite;

    const where = {
      organizacionId,
      tipoBoton: TipoBotonIa.ANALISIS_METRICAS,
      ...(clienteId ? { clienteId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.generacionIa.count({ where }),
      this.prisma.generacionIa.findMany({
        where,
        skip,
        take: limite,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          tipoBoton: true,
          salida: true,
          modelo: true,
          tokensEntrada: true,
          tokensSalida: true,
          clienteId: true,
          creadoEn: true,
        },
      }),
    ]);

    return { total, pagina, limite, items };
  }

  // Expuesto para que InformesService lo consuma sin duplicar la lógica.
  async construirResumen(organizacionId: string, clienteId: string, desde: Date, hasta: Date) {
    const metricas = await this.prisma.metricaPublicacion.findMany({
      where: { clienteId, organizacionId, fecha: { gte: desde, lte: hasta } },
    });
    const totales = metricas.reduce(
      (acc, m) => ({
        impresiones: acc.impresiones + m.impresiones,
        alcance: acc.alcance + m.alcance,
        meGusta: acc.meGusta + m.meGusta,
        comentarios: acc.comentarios + m.comentarios,
        compartidos: acc.compartidos + m.compartidos,
        guardados: acc.guardados + m.guardados,
        clics: acc.clics + m.clics,
        interacciones: acc.interacciones + m.meGusta + m.comentarios + m.compartidos + m.guardados,
      }),
      { impresiones: 0, alcance: 0, meGusta: 0, comentarios: 0, compartidos: 0, guardados: 0, clics: 0, interacciones: 0 },
    );
    const publicaciones = new Set(metricas.map((m) => m.publicacionId)).size;
    return { desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0], totales: { ...totales, publicaciones }, registros: metricas.length };
  }
}
