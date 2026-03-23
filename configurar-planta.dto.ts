import { IsNotEmpty, IsNumber, Min, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfigurarPlantaDto {
  @ApiProperty({ description: 'ID de la sucursal', example: 1 })
  @IsNotEmpty({ message: 'La sucursal es requerida' })
  @IsInt({ message: 'El ID de sucursal debe ser un entero' })
  @Type(() => Number)
  sucursalId: number;

  @ApiProperty({
    description: 'Caudal de diseño en m³ por día',
    example: 5.000,
  })
  @IsNotEmpty({ message: 'El caudal de diseño es requerido' })
  @IsNumber({}, { message: 'El caudal de diseño debe ser un número' })
  @Min(0, { message: 'El caudal de diseño no puede ser negativo' })
  @Type(() => Number)
  caudalDisenoM3dia: number;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre la configuración' })
  @IsOptional()
  @IsString()
  notas?: string;
}
