import { PartialType } from '@nestjs/swagger';
import { CrearClienteDto } from './crear-cliente.dto';

/** Todos los campos de creación, pero opcionales (actualización parcial). */
export class ActualizarClienteDto extends PartialType(CrearClienteDto) {}
