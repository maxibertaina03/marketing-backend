import { Global, Module } from '@nestjs/common';
import { GuardRoles } from './guards/guard-roles';

/**
 * Módulo global con utilidades transversales.
 * GuardAutenticacion se registra como guard global en AppModule (APP_GUARD).
 * GuardRoles se aplica por ruta con @UseGuards(GuardRoles), por eso se provee acá.
 */
@Global()
@Module({
  providers: [GuardRoles],
  exports: [GuardRoles],
})
export class ComunModule {}
