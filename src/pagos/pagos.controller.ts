import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { PagosService } from './pagos.service';
import { IniciarCheckoutDto } from './dto/iniciar-checkout.dto';
import { GuardRoles } from '../comun/guards/guard-roles';
import { Roles } from '../comun/decoradores/roles.decorator';
import { Publico } from '../comun/decoradores/publico.decorator';
import { OrgActual } from '../comun/decoradores/contexto-actual.decorator';

@ApiTags('pagos')
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post('checkout')
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Inicia el pago de un plan y devuelve la URL de Mercado Pago.' })
  checkout(@OrgActual() organizacionId: string, @Body() dto: IniciarCheckoutDto) {
    return this.pagos.iniciarCheckout(organizacionId, dto.plan);
  }

  @Get()
  @UseGuards(GuardRoles)
  @Roles(Rol.ADMIN)
  @ApiOperation({ summary: 'Historial de pagos de la organización.' })
  historial(@OrgActual() organizacionId: string) {
    return this.pagos.historial(organizacionId);
  }

  // Lo llama Mercado Pago (sin sesión). No confía en el cuerpo: verifica el pago
  // contra MP con nuestro token antes de activar nada. MP notifica a veces por
  // query (?type=payment&data.id=…) y a veces por body JSON: se cubren los dos.
  @Post('webhook')
  @Publico()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de Mercado Pago: confirma el pago y activa el plan.' })
  webhook(
    @Query() query: Record<string, string>,
    @Body() body: { type?: string; data?: { id?: string } },
  ) {
    const tipo = body?.type ?? query['type'];
    const dataId = body?.data?.id ?? query['data.id'] ?? query['id'];
    return this.pagos.procesarWebhook(tipo, dataId);
  }
}
