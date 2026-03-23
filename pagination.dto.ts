import { IsNumber, IsOptional, IsPositive, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(1)
  porPagina?: number = 10;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsString()
  asignado_a?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  prioridad?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  estado_excluir?: string;

  @IsOptional()
  @IsString()
  estado_incluir?: string;

  @IsOptional()
  @Type(() => Boolean)
  sin_asignar?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  con_asignar?: boolean;
}
