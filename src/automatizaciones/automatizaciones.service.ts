import { Injectable, Logger } from '@nestjs/common';
import { EstadoContenido, EstadoCliente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InformesService } from '../informes/informes.service';

@Injectable()
export class AutomatizacionesService {
  private readonly logger = new Logger(AutomatizacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly informes: InformesService,
  ) {}

  async publicarProgramadas() {
    const ahora = new Date();

    const publicaciones = await this.prisma.publicacion.findMany({
      where: {
        estado: EstadoContenido.APROBADO,
        fechaProgramada: { lte: ahora },
      },
      select: { id: true, titulo: true, organizacionId: true },
    });

    const resultados: { id: string; titulo: string; ok: boolean; error?: string }[] = [];

    for (const pub of publicaciones) {
      try {
        await this.prisma.publicacion.update({
          where: { id: pub.id },
          data: { estado: EstadoContenido.PUBLICADO },
        });
        resultados.push({ id: pub.id, titulo: pub.titulo, ok: true });
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error al publicar ${pub.id}: ${mensaje}`);
        resultados.push({ id: pub.id, titulo: pub.titulo, ok: false, error: mensaje });
      }
    }

    const resumen = { publicadas: resultados.filter((r) => r.ok).length, errores: resultados.filter((r) => !r.ok).length, detalle: resultados };

    await this.prisma.ejecucionJob.create({
      data: { tipo: 'PUBLICAR_PROGRAMADAS', resultado: resumen },
    });

    this.logger.log(`publicarProgramadas: ${resumen.publicadas} publicadas, ${resumen.errores} errores`);
    return resumen;
  }

  async generarInformesMensuales() {
    const orgs = await this.prisma.organizacion.findMany({ select: { id: true } });
    const resultados: { orgId: string; clienteId: string; periodo: string; ok: boolean; error?: string }[] = [];

    const ahora = new Date();
    const periodoAnterior = `${ahora.getFullYear()}${String(ahora.getMonth()).padStart(2, '0')}`;
    // getMonth() devuelve el mes actual 0-indexed, que es el mes anterior en YYYYMM
    const mes = ahora.getMonth() === 0 ? 12 : ahora.getMonth();
    const anio = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();
    const periodo = `${anio}${String(mes).padStart(2, '0')}`;

    for (const org of orgs) {
      const clientes = await this.prisma.cliente.findMany({
        where: { organizacionId: org.id, estado: EstadoCliente.ACTIVO },
        select: { id: true },
      });

      for (const cliente of clientes) {
        try {
          await this.informes.generar(org.id, { clienteId: cliente.id, periodo });
          resultados.push({ orgId: org.id, clienteId: cliente.id, periodo, ok: true });
        } catch (err) {
          const mensaje = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Informe fallido org=${org.id} cliente=${cliente.id}: ${mensaje}`);
          resultados.push({ orgId: org.id, clienteId: cliente.id, periodo, ok: false, error: mensaje });
        }
      }
    }

    const resumen = { generados: resultados.filter((r) => r.ok).length, errores: resultados.filter((r) => !r.ok).length, periodo, detalle: resultados };

    await this.prisma.ejecucionJob.create({
      data: { tipo: 'GENERAR_INFORMES_MENSUALES', resultado: resumen },
    });

    this.logger.log(`generarInformesMensuales: ${resumen.generados} generados, ${resumen.errores} errores`);
    return resumen;
  }

  async historial(filtros: { tipo?: string; pagina?: number; limite?: number }) {
    const { tipo, pagina = 1, limite = 20 } = filtros;
    const skip = (pagina - 1) * limite;
    const where = tipo ? { tipo } : {};

    const [total, items] = await Promise.all([
      this.prisma.ejecucionJob.count({ where }),
      this.prisma.ejecucionJob.findMany({
        where,
        skip,
        take: limite,
        orderBy: { ejecutadoEn: 'desc' },
      }),
    ]);

    return { total, pagina, limite, items };
  }
}
