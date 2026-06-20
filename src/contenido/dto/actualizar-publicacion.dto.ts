import { PartialType, OmitType } from '@nestjs/swagger';
import { CrearPublicacionDto } from './crear-publicacion.dto';

/** Todos los campos opcionales; estrategiaId no es modificable. */
export class ActualizarPublicacionDto extends PartialType(
  OmitType(CrearPublicacionDto, ['estrategiaId'] as const),
) {}
