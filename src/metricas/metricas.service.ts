import { ForbiddenException, Injectable } from '@nestjs/common';
import { Canal, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestarMetricasDto } from './dto/ingestar-metricas.dto';
import { FiltrarMetricasDto } from './dto/filtrar-metricas.dto';
import { ResumenMetricasDto } from './dto/resumen-metricas.dto';
import { SimularMetricasDto } from './dto/simular-metricas.dto';

/** Campos numéricos de una métrica (los que se suman/agregan). */
const CAMPOS = [
  'impresiones',
  'alcance',
  'meGusta',
  'comentarios',
  'compartidos',
  'guardados',
  'clics',
] as const;
type CampoMetrica = (typeof CAMPOS)[number];

/** Métrica mínima usada para agregar (los campos numéricos + dimensiones). */
type FilaAgregable = Record<CampoMetrica, number> & {
  canal: Canal;
  fecha: Date;
  publicacionId: string;
};

/**
 * Métricas de publicaciones (Fase 4, slice de masita). Ingesta (la llamará la
 * integración con Meta), lectura cruda (para la IA de Métricas e Informes de
 * capitán) y resumen agregado (para el Dashboard por cliente). Multi-tenant.
 */
@Injectable()
export class MetricasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ingesta un lote de métricas (upsert por publicación+fecha). */
  async ingestar(organizacionId: string, dto: IngestarMetricasDto) {
    const ids = [...new Set(dto.metricas.map((m) => m.publicacionId))];
    const publicaciones = await this.prisma.publicacion.findMany({
      where: { id: { in: ids }, organizacionId },
      select: { id: true, clienteId: true, canal: true },
    });
    const mapa = new Map(publicaciones.map((p) => [p.id, p]));

    const faltante = ids.find((id) => !mapa.has(id));
    if (faltante) {
      throw new ForbiddenException(`La publicación ${faltante} no pertenece a esta organización.`);
    }

    const operaciones = dto.metricas.map((m) => {
      const pub = mapa.get(m.publicacionId)!;
      const fecha = new Date(m.fecha);
      const valores = this.soloNumeros(m);
      return this.prisma.metricaPublicacion.upsert({
        where: { publicacionId_fecha: { publicacionId: m.publicacionId, fecha } },
        update: valores,
        create: {
          organizacionId,
          clienteId: pub.clienteId,
          publicacionId: m.publicacionId,
          canal: pub.canal,
          fecha,
          ...valores,
        },
      });
    });

    await this.prisma.$transaction(operaciones);
    return { ingestadas: operaciones.length };
  }

  /** Lista métricas crudas con filtros (multi-tenant). */
  async listar(organizacionId: string, filtros: FiltrarMetricasDto) {
    return this.prisma.metricaPublicacion.findMany({
      where: this.armarWhere(organizacionId, filtros),
      orderBy: [{ fecha: 'desc' }],
    });
  }

  /** Resumen agregado de un cliente para el dashboard (totales, por canal, serie). */
  async resumen(organizacionId: string, dto: ResumenMetricasDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);
    const filas = (await this.prisma.metricaPublicacion.findMany({
      where: this.armarWhere(organizacionId, {
        clienteId: dto.clienteId,
        desde: dto.desde,
        hasta: dto.hasta,
      }),
      select: {
        canal: true,
        fecha: true,
        publicacionId: true,
        impresiones: true,
        alcance: true,
        meGusta: true,
        comentarios: true,
        compartidos: true,
        guardados: true,
        clics: true,
      },
    })) as FilaAgregable[];

    const totales = this.acumular(filas);
    const publicaciones = new Set(filas.map((f) => f.publicacionId)).size;

    const porCanal = this.agruparPor(filas, (f) => f.canal).map(([canal, fs]) => ({
      canal,
      ...this.resumenCorto(fs),
    }));

    const serie = this.agruparPor(filas, (f) => f.fecha.toISOString().slice(0, 10))
      .map(([fecha, fs]) => ({ fecha, ...this.resumenCorto(fs) }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      clienteId: dto.clienteId,
      desde: dto.desde ?? null,
      hasta: dto.hasta ?? null,
      totales: { ...totales, interacciones: this.interacciones(totales), publicaciones },
      porCanal,
      serie,
    };
  }

  /** Genera métricas de prueba para un cliente (mientras no está la ingesta real). */
  async simular(organizacionId: string, dto: SimularMetricasDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);
    const dias = dto.dias ?? 14;
    const publicaciones = await this.prisma.publicacion.findMany({
      where: { clienteId: dto.clienteId, organizacionId },
      select: { id: true, canal: true },
    });
    if (publicaciones.length === 0) {
      return { generadas: 0, mensaje: 'El cliente no tiene publicaciones para generar métricas.' };
    }

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    const operaciones = [];
    for (const pub of publicaciones) {
      for (let d = 0; d < dias; d++) {
        const fecha = new Date(hoy);
        fecha.setUTCDate(fecha.getUTCDate() - d);
        const valores = this.metricaAleatoria();
        operaciones.push(
          this.prisma.metricaPublicacion.upsert({
            where: { publicacionId_fecha: { publicacionId: pub.id, fecha } },
            update: valores,
            create: {
              organizacionId,
              clienteId: dto.clienteId,
              publicacionId: pub.id,
              canal: pub.canal,
              fecha,
              ...valores,
            },
          }),
        );
      }
    }
    await this.prisma.$transaction(operaciones);
    return { generadas: operaciones.length };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private armarWhere(
    organizacionId: string,
    f: FiltrarMetricasDto,
  ): Prisma.MetricaPublicacionWhereInput {
    const fecha: Prisma.DateTimeFilter = {};
    if (f.desde) fecha.gte = new Date(f.desde);
    if (f.hasta) fecha.lte = new Date(f.hasta);
    return {
      organizacionId,
      ...(f.clienteId ? { clienteId: f.clienteId } : {}),
      ...(f.publicacionId ? { publicacionId: f.publicacionId } : {}),
      ...(f.desde || f.hasta ? { fecha } : {}),
    };
  }

  private soloNumeros(m: Partial<Record<CampoMetrica, number>>): Record<CampoMetrica, number> {
    return Object.fromEntries(CAMPOS.map((c) => [c, m[c] ?? 0])) as Record<CampoMetrica, number>;
  }

  private acumular(filas: FilaAgregable[]): Record<CampoMetrica, number> {
    const total = this.soloNumeros({});
    for (const fila of filas) {
      for (const campo of CAMPOS) total[campo] += fila[campo];
    }
    return total;
  }

  private resumenCorto(filas: FilaAgregable[]) {
    const t = this.acumular(filas);
    return { impresiones: t.impresiones, alcance: t.alcance, interacciones: this.interacciones(t) };
  }

  private interacciones(t: Record<CampoMetrica, number>): number {
    return t.meGusta + t.comentarios + t.compartidos + t.guardados;
  }

  private agruparPor<T, K>(items: T[], clave: (item: T) => K): [K, T[]][] {
    const mapa = new Map<K, T[]>();
    for (const item of items) {
      const k = clave(item);
      (mapa.get(k) ?? mapa.set(k, []).get(k)!).push(item);
    }
    return [...mapa.entries()];
  }

  private metricaAleatoria(): Record<CampoMetrica, number> {
    const impresiones = this.rnd(800, 6000);
    const alcance = Math.round(impresiones * this.rndFloat(0.55, 0.85));
    const meGusta = Math.round(alcance * this.rndFloat(0.02, 0.08));
    return {
      impresiones,
      alcance,
      meGusta,
      comentarios: Math.round(meGusta * this.rndFloat(0.05, 0.2)),
      compartidos: Math.round(meGusta * this.rndFloat(0.02, 0.15)),
      guardados: Math.round(meGusta * this.rndFloat(0.05, 0.25)),
      clics: Math.round(alcance * this.rndFloat(0.01, 0.05)),
    };
  }

  private rnd(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private rndFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private async verificarCliente(organizacionId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
      select: { id: true },
    });
    if (!cliente) {
      throw new ForbiddenException('El cliente no pertenece a esta organización.');
    }
  }
}
