import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Usuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CLAVE_PUBLICO } from '../decoradores/publico.decorator';
import type { PeticionConContexto } from '../tipos/contexto-peticion';

/**
 * Guard global de autenticación.
 *
 * 1. Deja pasar las rutas marcadas con @Publico().
 * 2. Verifica el JWT de Clerk (Bearer token) contra las JWKS públicas de Clerk.
 * 3. Provisiona el Usuario en la BD si es la primera vez que entra (JIT).
 * 4. Resuelve la organización activa (header `x-organizacion-id` o la única que tenga)
 *    y deja el contexto en `request.contexto`.
 *
 * El usuario queda siempre en `request.usuario`, aunque todavía no tenga organización
 * (necesario para poder crear la primera).
 */
@Injectable()
export class GuardAutenticacion implements CanActivate {
  private readonly logger = new Logger(GuardAutenticacion.name);
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwksUrl = this.config.getOrThrow<string>('CLERK_JWKS_URL');
    this.issuer = this.config.getOrThrow<string>('CLERK_ISSUER');
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) {
      return true;
    }

    const peticion = contexto.switchToHttp().getRequest<PeticionConContexto>();
    const payload = await this.verificarToken(peticion);

    const usuario = await this.provisionarUsuario(payload);
    peticion.usuario = usuario;

    await this.aplicarInvitacionesPendientes(usuario);
    await this.resolverContextoOrganizacion(peticion, usuario.id);
    return true;
  }

  /** Extrae y verifica el Bearer token, devolviendo el payload del JWT. */
  private async verificarToken(peticion: PeticionConContexto): Promise<JWTPayload> {
    const cabecera = peticion.headers['authorization'];
    if (!cabecera || !cabecera.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación.');
    }
    const token = cabecera.slice('Bearer '.length).trim();

    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });
      return payload;
    } catch (error) {
      this.logger.warn(`Token inválido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token de autenticación inválido o expirado.');
    }
  }

  /**
   * Busca el usuario por clerkId; si no existe lo crea con los datos del token.
   * Clerk incluye el id en `sub` y, según la plantilla del JWT, email/nombre.
   */
  private async provisionarUsuario(payload: JWTPayload) {
    const clerkId = payload.sub;
    if (!clerkId) {
      throw new UnauthorizedException('El token no contiene un identificador de usuario.');
    }

    const emailCrudo = (payload['email'] as string | undefined) ?? `${clerkId}@sin-email.local`;
    const email = emailCrudo.toLowerCase();
    const nombre = (payload['name'] as string | undefined) ?? null;

    return this.prisma.usuario.upsert({
      where: { clerkId },
      update: { email, nombre },
      create: { clerkId, email, nombre },
    });
  }

  /**
   * Convierte en membresías las invitaciones pendientes dirigidas al email del
   * usuario. Así, alguien invitado queda dentro de la organización apenas entra.
   */
  private async aplicarInvitacionesPendientes(usuario: Usuario): Promise<void> {
    const invitaciones = await this.prisma.invitacion.findMany({
      where: { email: usuario.email },
    });
    if (invitaciones.length === 0) {
      return;
    }

    await this.prisma.$transaction([
      ...invitaciones.map((inv) =>
        this.prisma.membresia.upsert({
          where: {
            usuarioId_organizacionId: {
              usuarioId: usuario.id,
              organizacionId: inv.organizacionId,
            },
          },
          update: {},
          create: {
            usuarioId: usuario.id,
            organizacionId: inv.organizacionId,
            rol: inv.rol,
            // Para invitaciones de CLIENTE, hereda la marca que representa.
            clienteId: inv.clienteId,
          },
        }),
      ),
      this.prisma.invitacion.deleteMany({ where: { email: usuario.email } }),
    ]);
  }

  /**
   * Determina la organización activa del usuario y deja el contexto en la petición.
   * - Si manda el header `x-organizacion-id`, valida que pertenezca a esa organización.
   * - Si no, usa su única membresía. Si tiene varias y no eligió, no se setea contexto
   *   (las rutas que requieran organización lo rechazarán vía GuardRoles).
   */
  private async resolverContextoOrganizacion(
    peticion: PeticionConContexto,
    usuarioId: string,
  ): Promise<void> {
    const organizacionSolicitada = peticion.headers['x-organizacion-id'] as string | undefined;

    const membresia = organizacionSolicitada
      ? await this.prisma.membresia.findUnique({
          where: {
            usuarioId_organizacionId: { usuarioId, organizacionId: organizacionSolicitada },
          },
        })
      : await this.elegirMembresiaUnica(usuarioId);

    if (membresia) {
      peticion.contexto = {
        usuario: peticion.usuario!,
        membresia,
        organizacionId: membresia.organizacionId,
        rol: membresia.rol,
      };
    }
  }

  /** Devuelve la membresía del usuario solo si tiene exactamente una. */
  private async elegirMembresiaUnica(usuarioId: string) {
    const membresias = await this.prisma.membresia.findMany({ where: { usuarioId }, take: 2 });
    return membresias.length === 1 ? membresias[0] : null;
  }
}
