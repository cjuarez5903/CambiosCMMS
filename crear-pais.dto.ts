import { IsNotEmpty, IsString, Length, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPais } from '../../../entities/pais.entity';

export class CrearPaisDto {
  @ApiProperty({ description: 'Nombre del país', example: 'Guatemala' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiProperty({ description: 'Código ISO del país', example: 'GT', maxLength: 3 })
  @IsString({ message: 'El código debe ser un texto' })
  @Length(2, 3, { message: 'El código debe tener 2 o 3 caracteres' })
  @IsNotEmpty({ message: 'El código es requerido' })
  codigo: string;

  @ApiPropertyOptional({ description: 'Código de moneda', example: 'GTQ', default: 'USD' })
  @IsOptional()
  @IsString({ message: 'La moneda debe ser un texto' })
  @Length(3, 3, { message: 'El código de moneda debe tener 3 caracteres' })
  moneda?: string;

  @ApiPropertyOptional({ description: 'Zona horaria', example: 'America/Guatemala' })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser un texto' })
  zonaHoraria?: string;

  @ApiPropertyOptional({ description: 'Estado del país', enum: EstadoPais })
  @IsOptional()
  @IsEnum(EstadoPais, { message: 'El estado debe ser: activo o inactivo' })
  estado?: EstadoPais;

  @ApiPropertyOptional({ description: 'ID del Gerente de País (Usuario)', example: 5 })
  @IsOptional()
  @IsInt({ message: 'El ID del gerente debe ser un número entero' })
  @Min(1)
  gerentePaisId?: number;
}
