import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { ConsumoIaService } from './consumo-ia.service';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('ia')
@Controller('ia/consumo')
export class ConsumoIaController {
  constructor(private readonly consumo: ConsumoIaService) {}

  @Get()
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN, Rol.COMMUNITY_MANAGER)
  @ApiOperation({
    summary: 'Consumo de IA del mes: total, cuota del plan y detalle por persona, marca y botón.',
  })
  resumen(@OrgActual() organizacionId: string) {
    return this.consumo.resumen(organizacionId);
  }
}
