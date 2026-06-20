import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearEstrategiaMarcaDto } from './dto/crear-estrategia-marca.dto';
import { ActualizarEstrategiaMarcaDto } from './dto/actualizar-estrategia-marca.dto';

@Injectable()
export class EstrategiaMarcaService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(organizacionId: string, dto: CrearEstrategiaMarcaDto) {
    await this.verificarClienteEnOrg(dto.clienteId, organizacionId);
    return this.prisma.estrategiaDeMarca.create({
      data: {
        nombre: dto.nombre,
        objetivo: dto.objetivo,
        publicoObjetivo: dto.publicoObjetivo,
        tono: dto.tono,
        pilares: dto.pilares,
        restricciones: dto.restricciones,
        clienteId: dto.clienteId,
        organizacionId,
      },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
  }

  async listar(organizacionId: string, clienteId?: string) {
    return this.prisma.estrategiaDeMarca.findMany({
      where: {
        organizacionId,
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cliente: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtener(organizacionId: string, id: string) {
    const estrategia = await this.prisma.estrategiaDeMarca.findFirst({
      where: { id, organizacionId },
      include: {
        cliente: { select: { id: true, nombre: true } },
        publicaciones: {
          orderBy: { fechaProgramada: 'asc' },
          take: 10,
        },
      },
    });
    if (!estrategia) throw new NotFoundException('Estrategia de marca no encontrada.');
    return estrategia;
  }

  async actualizar(organizacionId: string, id: string, dto: ActualizarEstrategiaMarcaDto) {
    await this.obtener(organizacionId, id);
    return this.prisma.estrategiaDeMarca.update({
      where: { id },
      data: { ...dto },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
  }

  async eliminar(organizacionId: string, id: string) {
    await this.obtener(organizacionId, id);
    await this.prisma.estrategiaDeMarca.delete({ where: { id } });
  }

  private async verificarClienteEnOrg(clienteId: string, organizacionId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, organizacionId },
    });
    if (!cliente) throw new ForbiddenException('El cliente no pertenece a esta organización.');
  }
}
