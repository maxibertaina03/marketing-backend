import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoBotonIa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';
import { GenerarEstrategiaMensualDto } from './dto/generar-estrategia-mensual.dto';
import { GenerarFodaDto } from './dto/generar-foda.dto';
import { GenerarBuyerPersonaDto } from './dto/generar-buyer-persona.dto';
import { GenerarPilaresDto } from './dto/generar-pilares.dto';

@Injectable()
export class IaEstrategiaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicioIa: ServicioIa,
  ) {}

  async generarEstrategiaMensual(organizacionId: string, dto: GenerarEstrategiaMensualDto) {
    const contexto = await this.armarContextoMarca(organizacionId, dto.clienteId, dto.estrategiaId);
    const ahora = new Date();
    const mes = dto.mes ?? ahora.getMonth() + 1;
    const anio = dto.anio ?? ahora.getFullYear();
    const nombreMes = new Date(anio, mes - 1, 1).toLocaleString('es-AR', { month: 'long' });

    return this.servicioIa.generar<{
      resumen: string;
      semanal: { semana: number; temas: string[]; canal?: string; formato?: string }[];
      hashtags: string[];
    }>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId: dto.estrategiaId,
      tipoBoton: TipoBotonIa.ESTRATEGIA_MENSUAL,
      contextoMarca: contexto,
      instruccion: `Generá una estrategia de contenido para el mes de ${nombreMes} ${anio}. Dividila en 4 semanas con temas, canales sugeridos y formatos para cada una. Incluí hashtags clave.`,
      esquemaSalida: {
        type: 'object',
        properties: {
          resumen: { type: 'string', description: 'Resumen ejecutivo de la estrategia mensual' },
          semanal: {
            type: 'array',
            description: 'Plan semanal (4 semanas)',
            items: {
              type: 'object',
              properties: {
                semana: { type: 'number' },
                temas: { type: 'array', items: { type: 'string' } },
                canal: { type: 'string' },
                formato: { type: 'string' },
              },
              required: ['semana', 'temas'],
            },
          },
          hashtags: { type: 'array', items: { type: 'string' } },
        },
        required: ['resumen', 'semanal', 'hashtags'],
      },
    });
  }

  async generarFoda(organizacionId: string, dto: GenerarFodaDto) {
    const contexto = await this.armarContextoMarca(organizacionId, dto.clienteId, dto.estrategiaId);

    return this.servicioIa.generar<{
      fortalezas: string[];
      oportunidades: string[];
      debilidades: string[];
      amenazas: string[];
    }>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId: dto.estrategiaId,
      tipoBoton: TipoBotonIa.FODA,
      contextoMarca: contexto,
      instruccion: 'Realizá un análisis FODA detallado de esta marca en el contexto de sus redes sociales y estrategia digital. Cada categoría debe tener entre 4 y 6 puntos concretos y accionables.',
      esquemaSalida: {
        type: 'object',
        properties: {
          fortalezas: { type: 'array', items: { type: 'string' } },
          oportunidades: { type: 'array', items: { type: 'string' } },
          debilidades: { type: 'array', items: { type: 'string' } },
          amenazas: { type: 'array', items: { type: 'string' } },
        },
        required: ['fortalezas', 'oportunidades', 'debilidades', 'amenazas'],
      },
    });
  }

  async generarBuyerPersona(organizacionId: string, dto: GenerarBuyerPersonaDto) {
    const contexto = await this.armarContextoMarca(organizacionId, dto.clienteId, dto.estrategiaId);

    return this.servicioIa.generar<{
      nombre: string;
      edad: string;
      ocupacion: string;
      intereses: string[];
      dolores: string[];
      motivaciones: string[];
      canalesFavoritos: string[];
    }>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId: dto.estrategiaId,
      tipoBoton: TipoBotonIa.BUYER_PERSONA,
      contextoMarca: contexto,
      instruccion: 'Creá el buyer persona principal de esta marca. Describí su perfil demográfico, intereses, dolores y motivaciones, y los canales digitales que más usa.',
      esquemaSalida: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre ficticio del buyer persona' },
          edad: { type: 'string', description: 'Rango de edad, ej: 25-35 años' },
          ocupacion: { type: 'string' },
          intereses: { type: 'array', items: { type: 'string' } },
          dolores: { type: 'array', items: { type: 'string' }, description: 'Problemas o frustraciones que la marca resuelve' },
          motivaciones: { type: 'array', items: { type: 'string' } },
          canalesFavoritos: { type: 'array', items: { type: 'string' } },
        },
        required: ['nombre', 'edad', 'ocupacion', 'intereses', 'dolores', 'motivaciones', 'canalesFavoritos'],
      },
    });
  }

  async generarPilares(organizacionId: string, dto: GenerarPilaresDto) {
    const contexto = await this.armarContextoMarca(organizacionId, dto.clienteId, dto.estrategiaId);
    const cantidad = dto.cantidad ?? 5;

    return this.servicioIa.generar<{
      pilares: { nombre: string; descripcion: string; ejemplos: string[] }[];
    }>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId: dto.estrategiaId,
      tipoBoton: TipoBotonIa.PILARES,
      contextoMarca: contexto,
      instruccion: `Definí ${cantidad} pilares de contenido para esta marca. Cada pilar debe tener nombre, descripción breve y 3 ejemplos de contenido concretos.`,
      esquemaSalida: {
        type: 'object',
        properties: {
          pilares: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                descripcion: { type: 'string' },
                ejemplos: { type: 'array', items: { type: 'string' } },
              },
              required: ['nombre', 'descripcion', 'ejemplos'],
            },
          },
        },
        required: ['pilares'],
      },
    });
  }

  async listarBanco(
    organizacionId: string,
    filtros: { clienteId?: string; estrategiaId?: string; tipoBoton?: TipoBotonIa; pagina?: number; limite?: number },
  ) {
    const pagina = filtros.pagina ?? 1;
    const limite = Math.min(filtros.limite ?? 20, 100);
    const salto = (pagina - 1) * limite;

    const where = {
      organizacionId,
      tipoBoton: {
        in: [
          TipoBotonIa.ESTRATEGIA_MENSUAL,
          TipoBotonIa.FODA,
          TipoBotonIa.BUYER_PERSONA,
          TipoBotonIa.PILARES,
        ],
      },
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(filtros.estrategiaId ? { estrategiaId: filtros.estrategiaId } : {}),
      ...(filtros.tipoBoton ? { tipoBoton: filtros.tipoBoton } : {}),
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
      cliente.promociones ? `PROMOCIONES ACTUALES: ${cliente.promociones}` : '',
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
