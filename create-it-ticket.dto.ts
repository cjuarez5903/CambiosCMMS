import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateITTicketDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsEnum(['abierto', 'en_progreso', 'resuelto', 'cerrado'])
  @IsOptional()
  estado?: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado' = 'abierto';

  @IsEnum(['baja', 'media', 'alta', 'critica'])
  @IsOptional()
  prioridad?: 'baja' | 'media' | 'alta' | 'critica' = 'media';

  @IsEnum(['soporte_tecnico', 'hardware', 'software', 'red', 'acceso', 'sap', 'sitelink'])
  @IsOptional()
  categoria?: 'soporte_tecnico' | 'hardware' | 'software' | 'red' | 'acceso' | 'sap' | 'sitelink' = 'soporte_tecnico';

  @IsString()
  @IsNotEmpty()
  solicitante: string;

  @IsString()
  @IsOptional()
  asignado_a?: string;
}
