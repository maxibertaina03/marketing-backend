import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from './notificaciones.service';
import { REGLAS } from './reglas';

/**
 * Motor de reglas del centro de notificaciones.
 *
 * Lo llama el cron una vez por día: recorre **cada organización × cada regla** y
 * emite lo que las reglas propongan. Una regla que falla queda registrada en el
 * resumen pero **no corta el job**: el resto se sigue evaluando.
 *
 * Agregar una regla = escribir el objeto y sumarlo a `REGLAS` (ver `reglas/index.ts`).
 */
@Injectable()
export class MotorReglasService {
  private readonly logger = new Logger(MotorReglasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async evaluarTodas() {
    const organizaciones = await this.prisma.organizacion.findMany({
      select: { id: true, nombre: true },
    });

    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);

    const detalle: Array<{
      organizacion: string;
      regla: string;
      avisos?: number;
      creados?: number;
      error?: string;
    }> = [];

    for (const organizacion of organizaciones) {
      for (const regla of REGLAS) {
        try {
          const avisos = await regla.evaluar({
            organizacionId: organizacion.id,
            prisma: this.prisma,
            hoy,
          });
          if (avisos.length === 0) continue;

          const { creados } = await this.notificaciones.emitirVarios(organizacion.id, avisos);
          detalle.push({
            organizacion: organizacion.nombre,
            regla: regla.nombre,
            avisos: avisos.length,
            creados,
          });
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          this.logger.error(`Regla "${regla.nombre}" falló en ${organizacion.nombre}: ${error}`);
          detalle.push({ organizacion: organizacion.nombre, regla: regla.nombre, error });
        }
      }
    }

    const resumen = {
      organizaciones: organizaciones.length,
      reglas: REGLAS.length,
      creados: detalle.reduce((total, d) => total + (d.creados ?? 0), 0),
      errores: detalle.filter((d) => d.error).length,
      detalle,
    };

    await this.prisma.ejecucionJob.create({
      data: { tipo: 'EVALUAR_REGLAS_NOTIFICACION', resultado: resumen },
    });

    this.logger.log(
      `evaluarTodas: ${resumen.creados} avisos creados, ${resumen.errores} errores ` +
        `(${resumen.reglas} reglas × ${resumen.organizaciones} organizaciones)`,
    );
    return resumen;
  }
}
