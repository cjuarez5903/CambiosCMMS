import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { EstadoTicket, PrioridadTicket, CategoriaTicket } from '../../../entities/it-ticket.entity';

export class CreateITTicketDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(EstadoTicket)
  @IsOptional()
  estado?: EstadoTicket = EstadoTicket.ABIERTO;

  @IsEnum(PrioridadTicket)
  @IsOptional()
  prioridad?: PrioridadTicket = PrioridadTicket.MEDIA;

  @IsEnum(CategoriaTicket)
  @IsOptional()
  categoria?: CategoriaTicket = CategoriaTicket.SOPORTE_TECNICO;

  @IsString()
  @IsNotEmpty()
  solicitante: string;

  @IsString()
  @IsOptional()
  asignado_a?: string;
}
