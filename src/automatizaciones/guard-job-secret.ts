import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Guard para endpoints de jobs automáticos. Valida el header `x-job-secret`
 * contra la variable de entorno JOB_SECRET. Lo dispara cron-job.org (o cualquier
 * scheduler externo) en el horario acordado.
 */
@Injectable()
export class GuardJobSecret implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const secret = req.headers['x-job-secret'];
    const expected = process.env.JOB_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Se requiere x-job-secret válido.');
    }
    return true;
  }
}
