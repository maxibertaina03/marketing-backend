import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Prefijo común para toda la API.
  app.setGlobalPrefix('api');

  // CORS: acepta el/los origen(es) de ORIGEN_FRONTEND (lista separada por comas),
  // cualquier subdominio *.vercel.app (Vercel da una URL por deploy) y localhost.
  const origenesPermitidos = (config.get<string>('ORIGEN_FRONTEND') ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origen, callback) => {
      if (!origen) {
        callback(null, true); // curl, health checks, server-to-server
        return;
      }
      let host = '';
      try {
        host = new URL(origen).hostname;
      } catch {
        callback(null, false);
        return;
      }
      const permitido =
        origenesPermitidos.includes(origen) ||
        host.endsWith('.vercel.app') ||
        host === 'localhost' ||
        host === '127.0.0.1';
      callback(null, permitido);
    },
    credentials: true,
  });

  // Validación automática de DTOs en todos los endpoints.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentación Swagger en /api/docs (el contrato entre back y front).
  const documento = new DocumentBuilder()
    .setTitle('ContentOS API')
    .setDescription('API del backend de ContentOS (gestión para agencias de marketing).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, documento));

  // En producción (Render/etc.) el puerto llega por la env PORT; en local usamos PUERTO.
  // Escuchamos en 0.0.0.0 para que la plataforma pueda exponer el servicio.
  const puerto = config.get<string>('PORT') ?? config.get<string>('PUERTO') ?? '3000';
  await app.listen(puerto, '0.0.0.0');
  Logger.log(`ContentOS API escuchando en el puerto ${puerto} (prefijo /api)`, 'Bootstrap');
  Logger.log('Swagger disponible en /api/docs', 'Bootstrap');
}

void bootstrap();
