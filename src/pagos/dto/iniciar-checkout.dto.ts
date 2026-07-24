import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PlanSuscripcion } from '@prisma/client';

export class IniciarCheckoutDto {
  @ApiProperty({ enum: PlanSuscripcion, description: 'Plan a contratar (Starter, Agency o Pro).' })
  @IsEnum(PlanSuscripcion)
  plan!: PlanSuscripcion;
}
