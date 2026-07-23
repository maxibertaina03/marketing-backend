import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { GuardSuperadmin } from './guard-superadmin';
import { SuperadminService } from './superadmin.service';

function contextoCon(email?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ usuario: email ? { email } : undefined }) }),
  } as unknown as ExecutionContext;
}

function guard(lista: string): GuardSuperadmin {
  const superadmin = new SuperadminService({ get: () => lista } as unknown as ConfigService);
  return new GuardSuperadmin(superadmin);
}

describe('GuardSuperadmin', () => {
  const LISTA = 'masita@contentos.com, capitan@contentos.com';

  it('deja pasar a un email de la lista', () => {
    expect(guard(LISTA).canActivate(contextoCon('masita@contentos.com'))).toBe(true);
  });

  it('es case-insensitive y tolera espacios', () => {
    expect(guard(LISTA).canActivate(contextoCon('  MASITA@contentos.com '))).toBe(true);
  });

  it('rechaza a un email que no está en la lista', () => {
    expect(() => guard(LISTA).canActivate(contextoCon('otro@gmail.com'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza si no hay usuario', () => {
    expect(() => guard(LISTA).canActivate(contextoCon(undefined))).toThrow(ForbiddenException);
  });

  it('con la lista vacía no entra nadie', () => {
    expect(() => guard('').canActivate(contextoCon('masita@contentos.com'))).toThrow(
      ForbiddenException,
    );
  });
});
