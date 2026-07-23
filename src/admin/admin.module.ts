import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminEstadoController } from './admin-estado.controller';
import { AdminService } from './admin.service';
import { SuperadminService } from './superadmin.service';

/**
 * Portal de superadministración (Fase 6). Aislado del resto: los endpoints
 * sensibles cuelgan de `GuardSuperadmin` (en `AdminController`); solo el estado
 * (soy/no soy superadmin) es accesible a cualquier autenticado.
 */
@Module({
  controllers: [AdminController, AdminEstadoController],
  providers: [AdminService, SuperadminService],
})
export class AdminModule {}
