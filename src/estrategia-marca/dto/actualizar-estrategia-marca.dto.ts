import { PartialType, OmitType } from '@nestjs/swagger';
import { CrearEstrategiaMarcaDto } from './crear-estrategia-marca.dto';

/** Todos los campos son opcionales al actualizar; clienteId no es modificable. */
export class ActualizarEstrategiaMarcaDto extends PartialType(
  OmitType(CrearEstrategiaMarcaDto, ['clienteId'] as const),
) {}
