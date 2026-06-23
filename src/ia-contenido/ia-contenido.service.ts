import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoBotonIa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicioIa } from '../ia/servicio-ia';
import {
  ESQUEMA_CARRUSEL,
  ESQUEMA_COPY,
  ESQUEMA_HOOKS,
  ESQUEMA_IDEAS,
  SalidaCarrusel,
  SalidaCopy,
  SalidaHooks,
  SalidaIdeas,
} from './esquemas';
import { GenerarIdeasDto } from './dto/generar-ideas.dto';
import { GenerarHooksDto } from './dto/generar-hooks.dto';
import { GenerarCarruselDto } from './dto/generar-carrusel.dto';
import { GenerarCopyDto } from './dto/generar-copy.dto';
import { FiltrarBibliotecaDto } from './dto/filtrar-biblioteca.dto';

/** Botones de IA cuyas generaciones forman la Biblioteca de Contenido. */
const TIPOS_CONTENIDO: TipoBotonIa[] = [
  TipoBotonIa.IDEAS_CONTENIDO,
  TipoBotonIa.HOOKS,
  TipoBotonIa.CARRUSEL,
  TipoBotonIa.COPYWRITING,
];

/**
 * IA de Contenido (Fase 2, slice de masita). Cada botón arma el contexto real
 * de la marca y delega en `ServicioIa.generar`, que fuerza la salida estructurada,
 * cachea el contexto y persiste la traza (de ahí sale la Biblioteca de Copys).
 */
@Injectable()
export class IaContenidoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly servicioIa: ServicioIa,
  ) {}

  /** Botón "Ideas de contenido". */
  async generarIdeas(organizacionId: string, dto: GenerarIdeasDto) {
    const { contextoMarca, estrategiaId } = await this.construirContexto(
      organizacionId,
      dto.clienteId,
      dto.estrategiaId,
    );
    const cantidad = dto.cantidad ?? 5;
    const instruccion =
      `Generá ${cantidad} ideas de contenido${dto.red ? ` para ${dto.red}` : ''}` +
      `${dto.tema ? ` sobre: ${dto.tema}` : ''}. ` +
      'Variadas en formato y alineadas a los pilares y el tono de la marca.';

    return this.servicioIa.generar<SalidaIdeas>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId,
      tipoBoton: TipoBotonIa.IDEAS_CONTENIDO,
      contextoMarca,
      instruccion,
      esquemaSalida: ESQUEMA_IDEAS,
    });
  }

  /** Botón "Hooks". */
  async generarHooks(organizacionId: string, dto: GenerarHooksDto) {
    const { contextoMarca, estrategiaId } = await this.construirContexto(
      organizacionId,
      dto.clienteId,
      dto.estrategiaId,
    );
    const cantidad = dto.cantidad ?? 5;
    const instruccion =
      `Generá ${cantidad} hooks (ganchos de apertura) potentes${dto.red ? ` para ${dto.red}` : ''} ` +
      `sobre: ${dto.tema}. Que detengan el scroll y respeten el tono de la marca.`;

    return this.servicioIa.generar<SalidaHooks>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId,
      tipoBoton: TipoBotonIa.HOOKS,
      contextoMarca,
      instruccion,
      esquemaSalida: ESQUEMA_HOOKS,
    });
  }

  /** Botón "Carrusel". */
  async generarCarrusel(organizacionId: string, dto: GenerarCarruselDto) {
    const { contextoMarca, estrategiaId } = await this.construirContexto(
      organizacionId,
      dto.clienteId,
      dto.estrategiaId,
    );
    const slides = dto.cantidadSlides ?? 6;
    const instruccion =
      `Generá un carrusel de ${slides} slides${dto.red ? ` para ${dto.red}` : ''} ` +
      `sobre: ${dto.tema}. Incluí caption (pie de foto) y hashtags. Tono de la marca.`;

    return this.servicioIa.generar<SalidaCarrusel>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId,
      tipoBoton: TipoBotonIa.CARRUSEL,
      contextoMarca,
      instruccion,
      esquemaSalida: ESQUEMA_CARRUSEL,
    });
  }

  /** Botón "Copy" (alimenta la Biblioteca de Copys). */
  async generarCopy(organizacionId: string, dto: GenerarCopyDto) {
    const { contextoMarca, estrategiaId } = await this.construirContexto(
      organizacionId,
      dto.clienteId,
      dto.estrategiaId,
    );
    const instruccion =
      `Escribí el copy de una publicación${dto.red ? ` para ${dto.red}` : ''} a partir de este brief: ` +
      `${dto.brief}.${dto.cta ? ` Llamado a la acción: ${dto.cta}.` : ''} ` +
      'Devolvé texto, hashtags y CTA. Respetá el tono de la marca.';

    return this.servicioIa.generar<SalidaCopy>({
      organizacionId,
      clienteId: dto.clienteId,
      estrategiaId,
      tipoBoton: TipoBotonIa.COPYWRITING,
      contextoMarca,
      instruccion,
      esquemaSalida: ESQUEMA_COPY,
    });
  }

  /** Biblioteca: lista las generaciones de contenido persistidas (paginado). */
  async listarBiblioteca(organizacionId: string, filtros: FiltrarBibliotecaDto) {
    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;
    const where: Prisma.GeneracionIaWhereInput = {
      organizacionId,
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      tipoBoton: filtros.tipoBoton ?? { in: TIPOS_CONTENIDO },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.generacionIa.count({ where }),
      this.prisma.generacionIa.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);

    return { total, pagina, limite, items };
  }

  /**
   * Carga el cliente (acotado a la organización) y su estrategia, y arma el
   * bloque de texto estable que se usa como `contextoMarca` (se cachea en la IA).
   */
  private async construirContexto(
    organizacionId: string,
    clienteId: string,
    estrategiaId?: string,
  ) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
      include: {
        estrategias: {
          where: estrategiaId ? { id: estrategiaId } : undefined,
          orderBy: { creadoEn: 'desc' },
          take: 1,
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException('El cliente no existe en esta organización.');
    }
    const estrategia = cliente.estrategias[0];
    if (estrategiaId && !estrategia) {
      throw new NotFoundException('La estrategia indicada no existe para este cliente.');
    }

    const lineas: string[] = [`# Marca: ${cliente.nombre}`];
    const agregar = (etiqueta: string, valor?: string | null) => {
      if (valor) lineas.push(`${etiqueta}: ${valor}`);
    };
    agregar('Rubro', cliente.rubro);
    agregar('Descripción', cliente.descripcion);
    agregar('Público objetivo', cliente.publicoObjetivo);
    agregar('Tono', cliente.tono);
    agregar('Productos/servicios', cliente.productosServicios);
    agregar('Objetivos', cliente.objetivos);
    agregar('Competencia', cliente.competencia);
    agregar('Promociones', cliente.promociones);

    if (estrategia) {
      lineas.push('', '# Estrategia de marca');
      agregar('Nombre', estrategia.nombre);
      agregar('Objetivo', estrategia.objetivo);
      agregar('Público objetivo', estrategia.publicoObjetivo);
      agregar('Tono de comunicación', estrategia.tono);
      if (estrategia.pilares.length) {
        lineas.push(`Pilares de contenido: ${estrategia.pilares.join(', ')}`);
      }
      agregar('Restricciones', estrategia.restricciones);
    }

    return { contextoMarca: lineas.join('\n'), estrategiaId: estrategia?.id };
  }
}
