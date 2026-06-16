import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembresiasService } from './membresias.service';
import { GuardRoles } from '../comun/guards/guard-roles';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('membresias')
@ApiBearerAuth()
@UseGuards(GuardRoles)
@Controller('membresias')
export class MembresiasController {
  constructor(private readonly membresias: MembresiasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los miembros de la organización activa.' })
  listar(@OrgActual() organizacionId: string) {
    return this.membresias.listarPorOrganizacion(organizacionId);
  }
}
