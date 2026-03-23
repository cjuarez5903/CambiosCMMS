import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sucursal } from './sucursal.entity';

@Entity('configuracion_planta_tratamiento')
export class ConfiguracionPlanta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sucursal_id', unique: true })
  sucursalId: number;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @Column({
    name: 'caudal_diseno_m3_dia',
    type: 'decimal',
    precision: 10,
    scale: 3,
    default: 0,
  })
  caudalDisenoM3dia: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
