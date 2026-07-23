import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fuente única de verdad de quién es superadmin: la lista `SUPERADMINS` del
 * entorno (emails separados por coma). La usan el `GuardSuperadmin` (para
 * proteger el portal) y el endpoint de estado (para que el front sepa si mostrar
 * la ruta). Así la regla vive en un solo lugar.
 */
@Injectable()
export class SuperadminService {
  private readonly emails: Set<string>;

  constructor(config: ConfigService) {
    const lista = config.get<string>('SUPERADMINS') ?? '';
    this.emails = new Set(
      lista
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  esSuperadmin(email?: string | null): boolean {
    if (!email) return false;
    return this.emails.has(email.trim().toLowerCase());
  }
}
