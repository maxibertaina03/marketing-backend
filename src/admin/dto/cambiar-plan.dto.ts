import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PlanSuscripcion } from '@prisma/client';

export class CambiarPlanDto {
  @ApiProperty({ enum: PlanSuscripcion })
  @IsEnum(PlanSuscripcion)
  plan!: PlanSuscripcion;

  /** Solo para PRUEBA: cuándo vence. Se ignora en los demás planes. */
  @ApiPropertyOptional({ description: 'ISO 8601. Vencimiento de la prueba.' })
  @IsOptional()
  @IsISO8601()
  expiraEn?: string;
}
