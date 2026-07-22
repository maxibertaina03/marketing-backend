import { ForbiddenException, Injectable } from '@nestjs/common';
import { Canal, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestarMetricasDto } from './dto/ingestar-metricas.dto';
import { FiltrarMetricasDto } from './dto/filtrar-metricas.dto';
import { ResumenMetricasDto } from './dto/resumen-metricas.dto';

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
 * Métricas de publicaciones (Fase 4, slice de masita). Ingesta (la usa la
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
        tipoMedio: dto.tipoMedio,
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

    // Instagram entrega valores ACUMULADOS por publicación (el alcance de un post
    // es su total histórico). Por eso el total real es la última foto de cada
    // publicación, no la suma de todas las fotos.
    const ultimas = this.ultimaFotoPorPublicacion(filas);
    const totales = this.acumular(ultimas);
    const publicaciones = ultimas.length;

    const porCanal = this.agruparPor(ultimas, (f) => f.canal).map(([canal, fs]) => ({
      canal,
      ...this.resumenCorto(fs),
    }));

    // La serie muestra lo que sumó cada día (diferencia contra la foto anterior).
    const serie = this.agruparPor(this.deltasDiarios(filas), (f) =>
      f.fecha.toISOString().slice(0, 10),
    )
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

  /**
   * Detalle por publicación: cuándo se publicó, su total acumulado y su evolución
   * día por día (cuánto sumó cada día).
   */
  async detalle(organizacionId: string, dto: ResumenMetricasDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);
    const filas = await this.prisma.metricaPublicacion.findMany({
      where: this.armarWhere(organizacionId, {
        clienteId: dto.clienteId,
        desde: dto.desde,
        hasta: dto.hasta,
        tipoMedio: dto.tipoMedio,
      }),
      orderBy: [{ fecha: 'asc' }],
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
        publicacion: {
          select: {
            titulo: true,
            tipoMedioMeta: true,
            fechaPublicacion: true,
            fechaProgramada: true,
            imagenUrl: true,
          },
        },
      },
    });

    const porPublicacion = new Map<string, typeof filas>();
    for (const fila of filas) {
      const previas = porPublicacion.get(fila.publicacionId) ?? [];
      previas.push(fila);
      porPublicacion.set(fila.publicacionId, previas);
    }

    return [...porPublicacion.entries()]
      .map(([publicacionId, fotos]) => {
        const orden = [...fotos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        const ultima = orden[orden.length - 1];
        const totales = this.soloNumeros(ultima);

        let previa: (typeof orden)[number] | null = null;
        const serie = orden.map((foto) => {
          const valores = this.soloNumeros({});
          for (const campo of CAMPOS) {
            valores[campo] = previa ? Math.max(0, foto[campo] - previa[campo]) : foto[campo];
          }
          previa = foto;
          return {
            fecha: foto.fecha.toISOString().slice(0, 10),
            ...valores,
            interacciones: this.interacciones(valores),
          };
        });

        const publicada = ultima.publicacion.fechaPublicacion ?? ultima.publicacion.fechaProgramada;
        return {
          publicacionId,
          titulo: ultima.publicacion.titulo,
          tipoMedio: ultima.publicacion.tipoMedioMeta,
          canal: ultima.canal,
          imagenUrl: ultima.publicacion.imagenUrl,
          fechaPublicacion: publicada ? publicada.toISOString() : null,
          totales: { ...totales, interacciones: this.interacciones(totales) },
          serie,
        };
      })
      .sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? ''));
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
      ...(f.tipoMedio ? { publicacion: { tipoMedioMeta: f.tipoMedio } } : {}),
      ...(f.desde || f.hasta ? { fecha } : {}),
    };
  }

  /** Última foto (valor acumulado) de cada publicación. */
  private ultimaFotoPorPublicacion(filas: FilaAgregable[]): FilaAgregable[] {
    const ultima = new Map<string, FilaAgregable>();
    for (const fila of filas) {
      const previa = ultima.get(fila.publicacionId);
      if (!previa || fila.fecha > previa.fecha) ultima.set(fila.publicacionId, fila);
    }
    return [...ultima.values()];
  }

  /** Convierte las fotos acumuladas en cuánto sumó cada publicación cada día. */
  private deltasDiarios(filas: FilaAgregable[]): FilaAgregable[] {
    const porPublicacion = new Map<string, FilaAgregable[]>();
    for (const fila of filas) {
      const previas = porPublicacion.get(fila.publicacionId) ?? [];
      previas.push(fila);
      porPublicacion.set(fila.publicacionId, previas);
    }

    const salida: FilaAgregable[] = [];
    for (const fotos of porPublicacion.values()) {
      const orden = [...fotos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      let previa: FilaAgregable | null = null;
      for (const foto of orden) {
        const valores = this.soloNumeros({});
        for (const campo of CAMPOS) {
          valores[campo] = previa ? Math.max(0, foto[campo] - previa[campo]) : foto[campo];
        }
        salida.push({ ...foto, ...valores });
        previa = foto;
      }
    }
    return salida;
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
