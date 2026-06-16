import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ComunModule } from './comun/comun.module';
import { GuardAutenticacion } from './comun/guards/guard-autenticacion';
import { SaludModule } from './salud/salud.module';
import { OrganizacionesModule } from './organizaciones/organizaciones.module';
import { MembresiasModule } from './membresias/membresias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ComunModule,
    SaludModule,
    OrganizacionesModule,
    MembresiasModule,
  ],
  providers: [
    // GuardAutenticacion corre en todas las rutas (excepto las marcadas con @Publico).
    { provide: APP_GUARD, useClass: GuardAutenticacion },
  ],
})
export class AppModule {}
