import { Body, Controller, Delete, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Rol } from '@prisma/client';
import { MetaService } from './meta.service';
import { ClienteMetaDto } from './dto/conectar-meta.dto';
import { PublicarPublicacionDto } from './dto/publicar-publicacion.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { Publico } from '../comun/decoradores/publico.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Integración con Meta (Instagram/Facebook). Conectar un cliente es OAuth: el
 * front abre la URL de `conectar`, Meta vuelve a `callback` (público, sin sesión),
 * y luego se pueden consultar el estado y sincronizar métricas reales.
 */
@ApiTags('meta')
@ApiBearerAuth()
@Controller('meta')
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get('conectar')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Devuelve la URL de autorización de Meta para conectar el cliente.' })
  conectar(@OrgActual() organizacionId: string, @Query() dto: ClienteMetaDto) {
    return this.meta.iniciarConexion(organizacionId, dto.clienteId);
  }

  // Sin @UseGuards(GuardRoles): Meta invoca este endpoint sin sesión de usuario.
  // La seguridad la da el HMAC del state firmado en iniciarConexion.
  @Get('callback')
  @Publico()
  @ApiOperation({ summary: 'Callback de OAuth de Meta. Redirige al front con el resultado.' })
  async callback(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const url = await this.meta.procesarCallback(code, state, error);
    res.redirect(url);
  }

  @Get('estado')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.ANALISTA)
  @ApiOperation({ summary: 'Estado de la conexión con Meta de un cliente.' })
  estado(@OrgActual() organizacionId: string, @Query() dto: ClienteMetaDto) {
    return this.meta.estado(organizacionId, dto.clienteId);
  }

  @Post('sincronizar')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Trae métricas reales de Instagram y las guarda como snapshot.' })
  sincronizar(@OrgActual() organizacionId: string, @Body() dto: ClienteMetaDto) {
    return this.meta.sincronizar(organizacionId, dto.clienteId);
  }

  @Post('publicar')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Publica en Instagram una publicación aprobada del calendario.' })
  publicar(@OrgActual() organizacionId: string, @Body() dto: PublicarPublicacionDto) {
    return this.meta.publicar(organizacionId, dto);
  }

  @Delete('conexion')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({ summary: 'Desconecta Meta de un cliente.' })
  desconectar(@OrgActual() organizacionId: string, @Query() dto: ClienteMetaDto) {
    return this.meta.desconectar(organizacionId, dto.clienteId);
  }
}
