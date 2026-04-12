import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller';
import { OrdenTrabajo } from '../../entities/orden-trabajo.entity';
import { HistorialOrdenTrabajo } from '../../entities/historial-orden-trabajo.entity';
import { OrdenTrabajoComentario } from '../../entities/orden-trabajo-comentario.entity';
import { Sucursal } from '../../entities/sucursal.entity';
import { Pais } from '../../entities/pais.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Proveedor } from '../../entities/proveedor.entity';
import { CapexModule } from '../capex/capex.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrdenTrabajo, HistorialOrdenTrabajo, OrdenTrabajoComentario, Sucursal, Pais, Usuario, Proveedor]),
    CapexModule,
    EmailModule,
  ],
  controllers: [OrdenesTrabajoController],
  providers: [OrdenesTrabajoService],
  exports: [OrdenesTrabajoService],
})
export class OrdenesTrabajoModule {}
