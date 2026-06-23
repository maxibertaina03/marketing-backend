import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { IaContenidoService } from './ia-contenido.service';
import { GenerarIdeasDto } from './dto/generar-ideas.dto';
import { GenerarHooksDto } from './dto/generar-hooks.dto';
import { GenerarCarruselDto } from './dto/generar-carrusel.dto';
import { GenerarCopyDto } from './dto/generar-copy.dto';
import { FiltrarBibliotecaDto } from './dto/filtrar-biblioteca.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

/**
 * Centro de IA — Contenido (Fase 2). Botones que generan piezas a partir del
 * contexto de la marca, y la Biblioteca con el historial de generaciones.
 * Generar: ADMIN, COMMUNITY_MANAGER o COPYWRITER. Leer la biblioteca: cualquier miembro.
 */
@ApiTags('ia-contenido')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('ia-contenido')
export class IaContenidoController {
  constructor(private readonly iaContenido: IaContenidoService) {}

  @Post('ideas')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Genera ideas de contenido para una marca (IA).' })
  generarIdeas(@OrgActual() organizacionId: string, @Body() dto: GenerarIdeasDto) {
    return this.iaContenido.generarIdeas(organizacionId, dto);
  }

  @Post('hooks')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Genera hooks (ganchos de apertura) para una pieza.' })
  generarHooks(@OrgActual() organizacionId: string, @Body() dto: GenerarHooksDto) {
    return this.iaContenido.generarHooks(organizacionId, dto);
  }

  @Post('carrusel')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Genera un carrusel (slides + caption + hashtags).' })
  generarCarrusel(@OrgActual() organizacionId: string, @Body() dto: GenerarCarruselDto) {
    return this.iaContenido.generarCarrusel(organizacionId, dto);
  }

  @Post('copy')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER, Rol.COPYWRITER)
  @ApiOperation({ summary: 'Genera el copy de una publicación desde un brief.' })
  generarCopy(@OrgActual() organizacionId: string, @Body() dto: GenerarCopyDto) {
    return this.iaContenido.generarCopy(organizacionId, dto);
  }

  @Get('biblioteca')
  @ApiOperation({
    summary: 'Biblioteca de generaciones de contenido (copys, ideas, hooks, carruseles).',
  })
  listarBiblioteca(@OrgActual() organizacionId: string, @Query() filtros: FiltrarBibliotecaDto) {
    return this.iaContenido.listarBiblioteca(organizacionId, filtros);
  }
}
