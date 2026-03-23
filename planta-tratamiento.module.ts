import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantaTratamientoService } from './planta-tratamiento.service';
import { PlantaTratamientoController } from './planta-tratamiento.controller';
import { LecturaPlanta } from '../../entities/lectura-planta.entity';
import { ConfiguracionPlanta } from '../../entities/configuracion-planta.entity';
import { Sucursal } from '../../entities/sucursal.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Pais } from '../../entities/pais.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LecturaPlanta, ConfiguracionPlanta, Sucursal, Usuario, Pais]),
    EmailModule,
  ],
  controllers: [PlantaTratamientoController],
  providers: [PlantaTratamientoService],
  exports: [PlantaTratamientoService],
})
export class PlantaTratamientoModule {}
