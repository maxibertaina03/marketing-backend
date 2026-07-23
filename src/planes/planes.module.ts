import { Module } from '@nestjs/common';
import { PlanesService } from './planes.service';

/**
 * Límites del plan que son un conteo (marcas, usuarios internos). Se exporta el
 * servicio para que `clientes` y `equipo` lo verifiquen antes de crear.
 * La cuota de IA vive aparte, en `IaModule` (`ConsumoIaService`).
 */
@Module({
  providers: [PlanesService],
  exports: [PlanesService],
})
export class PlanesModule {}
