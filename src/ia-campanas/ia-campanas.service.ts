import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';
import { GenerarCampanaDto } from './dto/generar-campana.dto';

@Injectable()
export class IaCampanasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicioIa: ServicioIa,
  ) {}

  async generarCampana(organizacionId: string, dto: GenerarCampanaDto) {
    const contexto = await this.armarContextoMarca(organizacionId, dto.clienteId, dto.estrategiaId);

    const extras = [
      `NOMBRE DE LA CAMPAÑA: ${dto.nombre}`,
      `OBJETIVO: ${dto.objetivo}`,
      dto.duracionDias ? `DURACIÓN: ${dto.duracionDias} días` : '',
      dto.canales?.length ? `CANALES: ${dto.canales.join(', ')}` : '',
      dto.presupuesto ? `PRESUPUESTO: ${dto.presupuesto}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return this.servicioIa.generar<{
      nombre: string;
      descripcion: string;
      publico: string;
      fases: { nombre: string; duracionDias: number; acciones: string[] }[];
      contenidosClave: string[];
      hashtags: string[];
      kpis: string[];
    }>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId: dto.estrategiaId,
      tipoBoton: TipoBotonIa.CAMPANA,
      contextoMarca: contexto,
      instruccion: `Creá una campaña de marketing digital completa con los siguientes datos:\n${extras}\n\nDesarrollá las fases, acciones concretas, contenidos clave, hashtags y KPIs a medir.`,
      esquemaSalida: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          descripcion: { type: 'string', description: 'Resumen ejecutivo de la campaña' },
          publico: { type: 'string', description: 'Público objetivo específico de la campaña' },
          fases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                duracionDias: { type: 'number' },
                acciones: { type: 'array', items: { type: 'string' } },
              },
              required: ['nombre', 'duracionDias', 'acciones'],
            },
          },
          contenidosClave: { type: 'array', items: { type: 'string' }, description: 'Piezas de contenido principales' },
          hashtags: { type: 'array', items: { type: 'string' } },
          kpis: { type: 'array', items: { type: 'string' }, description: 'Métricas a medir' },
        },
        required: ['nombre', 'descripcion', 'publico', 'fases', 'contenidosClave', 'hashtags', 'kpis'],
      },
    });
  }

  async listarBiblioteca(
    organizacionId: string,
    filtros: { clienteId?: string; pagina?: number; limite?: number },
  ) {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const salto = (pagina - 1) * limite;

    const where = {
      organizacionId,
      tipoBoton: TipoBotonIa.CAMPANA,
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.generacionIa.count({ where }),
      this.prisma.generacionIa.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: salto,
        take: limite,
      }),
    ]);

    return { total, pagina, limite, items };
  }

  private async armarContextoMarca(
    organizacionId: string,
    clienteId: string,
    estrategiaId?: string,
  ): Promise<string> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado en esta organización.');

    let estrategia = null;
    if (estrategiaId) {
      estrategia = await this.prisma.estrategiaDeMarca.findFirst({
        where: { id: estrategiaId, clienteId, organizacionId },
      });
    }

    const lineas = [
      `MARCA: ${cliente.nombre}`,
      cliente.rubro ? `RUBRO: ${cliente.rubro}` : '',
      cliente.descripcion ? `DESCRIPCIÓN: ${cliente.descripcion}` : '',
      cliente.ubicacion ? `UBICACIÓN: ${cliente.ubicacion}` : '',
      cliente.publicoObjetivo ? `PÚBLICO OBJETIVO: ${cliente.publicoObjetivo}` : '',
      cliente.tono ? `TONO: ${cliente.tono}` : '',
      cliente.productosServicios ? `PRODUCTOS/SERVICIOS: ${cliente.productosServicios}` : '',
      cliente.objetivos ? `OBJETIVOS DEL NEGOCIO: ${cliente.objetivos}` : '',
      cliente.competencia ? `COMPETENCIA: ${cliente.competencia}` : '',
    ];

    if (estrategia) {
      lineas.push(
        ``,
        `ESTRATEGIA DE MARCA: ${estrategia.nombre}`,
        `OBJETIVO ESTRATÉGICO: ${estrategia.objetivo}`,
        `PÚBLICO: ${estrategia.publicoObjetivo}`,
        `TONO DE COMUNICACIÓN: ${estrategia.tono}`,
        `PILARES: ${estrategia.pilares.join(', ')}`,
        estrategia.restricciones ? `RESTRICCIONES: ${estrategia.restricciones}` : '',
      );
    }

    return lineas.filter(Boolean).join('\n');
  }
}
