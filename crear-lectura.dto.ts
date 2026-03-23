import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CrearLecturaDto {
  @ApiProperty({
    description: 'Lectura actual del contador de agua en metros cúbicos (m³)',
    example: 153.500,
  })
  @IsNotEmpty({ message: 'La lectura actual es requerida' })
  @IsNumber({}, { message: 'La lectura debe ser un número' })
  @Min(0, { message: 'La lectura no puede ser negativa' })
  @Type(() => Number)
  lecturaActualM3: number;
}
