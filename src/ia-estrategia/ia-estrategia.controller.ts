import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol, TipoBotonIa } from '@prisma/client';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { Roles } from '../comun/decoradores/roles.decorator';
import { IaEstrategiaService } from './ia-estrategia.service';
import { GenerarEstrategiaMensualDto } from './dto/generar-estrategia-mensual.dto';
import { GenerarFodaDto } from './dto/generar-foda.dto';
import { GenerarBuyerPersonaDto } from './dto/generar-buyer-persona.dto';
import { GenerarPilaresDto } from './dto/generar-pilares.dto';
import { GenerarOportunidadesDto } from './dto/generar-oportunidades.dto';

@ApiTags('ia-estrategia')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('ia-estrategia')
export class IaEstrategiaController {
  constructor(private readonly servicio: IaEstrategiaService) {}

  @Post('estrategia-mensual')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera un plan de contenido mensual para la marca' })
  generarEstrategiaMensual(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarEstrategiaMensualDto,
  ) {
    return this.servicio.generarEstrategiaMensual(organizacionId, dto);
  }

  @Post('foda')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera un análisis FODA de la marca' })
  generarFoda(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarFodaDto,
  ) {
    return this.servicio.generarFoda(organizacionId, dto);
  }

  @Post('buyer-persona')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera el buyer persona principal de la marca' })
  generarBuyerPersona(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarBuyerPersonaDto,
  ) {
    return this.servicio.generarBuyerPersona(organizacionId, dto);
  }

  @Post('pilares')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sugiere pilares de contenido para la marca' })
  generarPilares(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarPilaresDto,
  ) {
    return this.servicio.generarPilares(organizacionId, dto);
  }

  @Post('oportunidades')
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera oportunidades de crecimiento cruzando estrategia y métricas reales' })
  generarOportunidades(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarOportunidadesDto,
  ) {
    return this.servicio.generarOportunidades(organizacionId, dto);
  }

  @Get('banco')
  @ApiOperation({ summary: 'Historial de generaciones estratégicas (Banco de Ideas)' })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'estrategiaId', required: false })
  @ApiQuery({ name: 'tipoBoton', required: false, enum: TipoBotonIa })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  listarBanco(
    @OrgActual() organizacionId: string,
    @Query('clienteId') clienteId?: string,
    @Query('estrategiaId') estrategiaId?: string,
    @Query('tipoBoton') tipoBoton?: TipoBotonIa,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina = 1,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite = 20,
  ) {
    return this.servicio.listarBanco(organizacionId, { clienteId, estrategiaId, tipoBoton, pagina, limite });
  }
}
