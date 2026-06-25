import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IaMetricasService } from '../ia-metricas/ia-metricas.service';
import { GenerarInformeDto } from './dto/generar-informe.dto';
import { FiltrarInformesDto } from './dto/filtrar-informes.dto';

function periodoAnterior(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function rangoDelPeriodo(periodo: string): { desde: Date; hasta: Date } {
  const anio = parseInt(periodo.slice(0, 4));
  const mes = parseInt(periodo.slice(4, 6)) - 1; // 0-indexed
  const desde = new Date(anio, mes, 1);
  const hasta = new Date(anio, mes + 1, 0); // último día del mes
  return { desde, hasta };
}

@Injectable()
export class InformesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iaMetricas: IaMetricasService,
  ) {}

  async generar(organizacionId: string, dto: GenerarInformeDto) {
    const { clienteId } = dto;
    const periodo = dto.periodo ?? periodoAnterior();

    const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, organizacionId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const { desde, hasta } = rangoDelPeriodo(periodo);

    const resumenMetricas = await this.iaMetricas.construirResumen(organizacionId, clienteId, desde, hasta);

    const analisis = await this.iaMetricas.analizar(organizacionId, { clienteId, desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0] });

    return this.prisma.informe.upsert({
      where: { clienteId_periodo: { clienteId, periodo } },
      create: {
        periodo,
        resumenMetricas,
        analisisIa: analisis.salida as object,
        generacionIaId: analisis.generacionId,
        clienteId,
        organizacionId,
      },
      update: {
        resumenMetricas,
        analisisIa: analisis.salida as object,
        generacionIaId: analisis.generacionId,
      },
    });
  }

  async listar(organizacionId: string, filtros: FiltrarInformesDto) {
    const { clienteId, pagina = 1, limite = 20 } = filtros;
    const skip = (pagina - 1) * limite;

    const where = { organizacionId, ...(clienteId ? { clienteId } : {}) };

    const [total, items] = await Promise.all([
      this.prisma.informe.count({ where }),
      this.prisma.informe.findMany({
        where,
        skip,
        take: limite,
        orderBy: { periodo: 'desc' },
        select: {
          id: true,
          periodo: true,
          clienteId: true,
          creadoEn: true,
          actualizadoEn: true,
          cliente: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    return { total, pagina, limite, items };
  }

  async obtener(organizacionId: string, id: string) {
    const informe = await this.prisma.informe.findFirst({
      where: { id, organizacionId },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    if (!informe) throw new NotFoundException('Informe no encontrado.');
    return informe;
  }
}
