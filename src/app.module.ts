import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ComunModule } from './comun/comun.module';
import { GuardAutenticacion } from './comun/guards/guard-autenticacion';
import { SaludModule } from './salud/salud.module';
import { OrganizacionesModule } from './organizaciones/organizaciones.module';
import { MembresiasModule } from './membresias/membresias.module';
import { ClientesModule } from './clientes/clientes.module';
import { EquipoModule } from './equipo/equipo.module';
import { EstrategiaMarcaModule } from './estrategia-marca/estrategia-marca.module';
import { ContenidoModule } from './contenido/contenido.module';
import { IaModule } from './ia/ia.module';
import { IaContenidoModule } from './ia-contenido/ia-contenido.module';
import { IaEstrategiaModule } from './ia-estrategia/ia-estrategia.module';
import { IaCampanasModule } from './ia-campanas/ia-campanas.module';
import { ProduccionModule } from './produccion/produccion.module';
import { ArchivosModule } from './archivos/archivos.module';
import { AprobacionesModule } from './aprobaciones/aprobaciones.module';
import { PortalClienteModule } from './portal-cliente/portal-cliente.module';
import { MetricasModule } from './metricas/metricas.module';
import { IaMetricasModule } from './ia-metricas/ia-metricas.module';
import { InformesModule } from './informes/informes.module';
import { AutomatizacionesModule } from './automatizaciones/automatizaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ComunModule,
    SaludModule,
    OrganizacionesModule,
    MembresiasModule,
    ClientesModule,
    EquipoModule,
    EstrategiaMarcaModule,
    ContenidoModule,
    IaModule,
    IaContenidoModule,
    IaEstrategiaModule,
    IaCampanasModule,
    ProduccionModule,
    ArchivosModule,
    AprobacionesModule,
    PortalClienteModule,
    MetricasModule,
    IaMetricasModule,
    InformesModule,
    AutomatizacionesModule,
  ],
  providers: [
    // GuardAutenticacion corre en todas las rutas (excepto las marcadas con @Publico).
    { provide: APP_GUARD, useClass: GuardAutenticacion },
  ],
})
export class AppModule {}
