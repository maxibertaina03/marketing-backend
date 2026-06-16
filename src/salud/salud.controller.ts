import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Publico } from '../comun/decoradores/publico.decorator';

/** Endpoint público de salud: lo usa el frontend y los chequeos de despliegue. */
@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Verifica que el servidor y la base de datos respondan.' })
  async verificar() {
    let baseDeDatos = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      baseDeDatos = 'error';
    }

    return {
      estado: 'ok',
      baseDeDatos,
      marcaDeTiempo: new Date().toISOString(),
    };
  }
}
