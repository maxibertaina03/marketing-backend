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
import { Rol } from '@prisma/client';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';
import { Roles } from '../comun/decoradores/roles.decorator';
import { IaCampanasService } from './ia-campanas.service';
import { GenerarCampanaDto } from './dto/generar-campana.dto';

@ApiTags('ia-campanas')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('ia-campanas')
export class IaCampanasController {
  constructor(private readonly servicio: IaCampanasService) {}

  @Post()
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Genera una campaña de marketing digital completa' })
  generarCampana(
    @OrgActual() organizacionId: string,
    @Body() dto: GenerarCampanaDto,
  ) {
    return this.servicio.generarCampana(organizacionId, dto);
  }

  @Get('biblioteca')
  @ApiOperation({ summary: 'Historial de campañas generadas (Biblioteca de Campañas)' })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  listarBiblioteca(
    @OrgActual() organizacionId: string,
    @Query('clienteId') clienteId?: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina = 1,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite = 20,
  ) {
    return this.servicio.listarBiblioteca(organizacionId, { clienteId, pagina, limite });
  }
}
