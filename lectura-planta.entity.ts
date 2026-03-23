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
import { Usuario } from './usuario.entity';

@Entity('lecturas_planta_tratamiento')
export class LecturaPlanta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sucursal_id' })
  sucursalId: number;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @Column({ name: 'fecha_registro', type: 'date' })
  fechaRegistro: string;

  @Column({ name: 'hora_registro', type: 'datetime' })
  horaRegistro: Date;

  @Column({
    name: 'lectura_actual_m3',
    type: 'decimal',
    precision: 10,
    scale: 3,
  })
  lecturaActualM3: number;

  @Column({
    name: 'lectura_anterior_m3',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  lecturaAnteriorM3: number;

  @Column({
    name: 'consumo_diario_m3',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  consumoDiarioM3: number;

  @Column({ name: 'alerta_generada', default: false })
  alertaGenerada: boolean;

  @Column({ name: 'creado_por_id' })
  creadoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
