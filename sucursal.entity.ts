import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pais } from './pais.entity';
// No importar Usuario directamente — evita importación circular con usuario.entity.ts
// TypeORM resuelve la entidad por nombre en runtime

export enum TipoInstalacion {
  BODEGA = 'bodega'
}

export enum EstadoSucursal {
  ACTIVA = 'activa',
  INACTIVA = 'inactiva',
  MANTENIMIENTO = 'mantenimiento',
}

@Entity('sucursales')
export class Sucursal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pais_id' })
  paisId: number;

  @ManyToOne(() => Pais)
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @Column()
  nombre: string;

  @Column({ unique: true })
  codigo: string;

  @Column({
    name: 'tipo_instalacion',
    type: 'enum',
    enum: TipoInstalacion,
  })
  tipoInstalacion: TipoInstalacion;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ nullable: true })
  ciudad: string;

  @Column({ name: 'estado_provincia', nullable: true })
  estadoProvincia: string;

  @Column({ name: 'codigo_postal', nullable: true })
  codigoPostal: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'gerente_id', nullable: true })
  gerenteId: number;

  @ManyToOne('Usuario', { nullable: true, eager: false })
  @JoinColumn({ name: 'gerente_id' })
  gerente: { id: number; email: string; nombre: string; apellido: string };

  @Column({ name: 'total_unidades', default: 0 })
  totalUnidades: number;

  @Column({ name: 'metros_cuadrados', type: 'decimal', precision: 10, scale: 2, nullable: true })
  metrosCuadrados: number;

  @Column({
    type: 'enum',
    enum: EstadoSucursal,
    default: EstadoSucursal.ACTIVA,
  })
  estado: EstadoSucursal;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
