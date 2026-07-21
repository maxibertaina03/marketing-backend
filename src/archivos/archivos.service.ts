import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CrearArchivoDto } from './dto/crear-archivo.dto';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { FiltrarArchivosDto } from './dto/filtrar-archivos.dto';
import { FirmarSubidaDto } from './dto/firmar-subida.dto';

/**
 * Gestión de Archivos (Fase 2, slice de masita). Guarda metadata + URL; el binario
 * vive en Cloudinary. La subida es **directa desde el navegador**: el backend solo
 * firma la operación (Render free no debe proxyear archivos pesados). Multi-tenant.
 */
@Injectable()
export class ArchivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Firma una subida directa a Cloudinary para una marca de la organización.
   * Devuelve los datos que el navegador manda junto al archivo. La carpeta acota
   * los archivos por organización y cliente.
   */
  async firmarSubida(organizacionId: string, dto: FirmarSubidaDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY') ?? '';
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET') ?? '';
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'La subida de archivos no está configurada (faltan credenciales de Cloudinary).',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `contentos/${organizacionId}/${dto.clienteId}`;
    // Cloudinary firma los parámetros ordenados alfabéticamente + el api_secret.
    const aFirmar = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(`${aFirmar}${apiSecret}`).digest('hex');

    return {
      url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    };
  }

  /** Registra un archivo de una marca de la organización. */
  async crear(organizacionId: string, dto: CrearArchivoDto) {
    await this.verificarCliente(organizacionId, dto.clienteId);
    if (dto.publicacionId) {
      await this.verificarPublicacion(organizacionId, dto.publicacionId);
    }

    return this.prisma.archivo.create({
      data: {
        nombre: dto.nombre,
        url: dto.url,
        tipo: dto.tipo,
        tamanoBytes: dto.tamanoBytes,
        clienteId: dto.clienteId,
        publicacionId: dto.publicacionId ?? null,
        organizacionId,
      },
    });
  }

  /** Lista los archivos de la organización con filtros opcionales. */
  async listar(organizacionId: string, filtros: FiltrarArchivosDto) {
    const where: Prisma.ArchivoWhereInput = {
      organizacionId,
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(filtros.publicacionId ? { publicacionId: filtros.publicacionId } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    };
    return this.prisma.archivo.findMany({ where, orderBy: { creadoEn: 'desc' } });
  }

  /** Devuelve un archivo de la organización o lanza 404. */
  async obtener(organizacionId: string, id: string) {
    const archivo = await this.prisma.archivo.findFirst({ where: { id, organizacionId } });
    if (!archivo) {
      throw new NotFoundException('El archivo no existe en esta organización.');
    }
    return archivo;
  }

  /** Actualiza parcialmente un archivo. */
  async actualizar(organizacionId: string, id: string, dto: ActualizarArchivoDto) {
    await this.obtener(organizacionId, id);
    if (dto.publicacionId) {
      await this.verificarPublicacion(organizacionId, dto.publicacionId);
    }

    return this.prisma.archivo.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        url: dto.url,
        tipo: dto.tipo,
        tamanoBytes: dto.tamanoBytes,
        ...(dto.publicacionId !== undefined ? { publicacionId: dto.publicacionId } : {}),
      },
    });
  }

  /** Elimina (desregistra) un archivo de la organización. */
  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.archivo.delete({ where: { id } });
    return { eliminado: true };
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

  private async verificarPublicacion(organizacionId: string, publicacionId: string) {
    const publicacion = await this.prisma.publicacion.findFirst({
      where: { id: publicacionId, organizacionId },
      select: { id: true },
    });
    if (!publicacion) {
      throw new ForbiddenException('La publicación no pertenece a esta organización.');
    }
  }
}
