import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
// No importar Usuario directamente — evita importación circular con sucursal.entity.ts
// TypeORM resuelve la entidad por nombre en runtime

export enum EstadoPais {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

@Entity('paises')
export class Pais {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ unique: true })
  codigo: string;

  @Column({ default: 'USD' })
  moneda: string;

  @Column({ name: 'tasa_cambio_usd', type: 'decimal', precision: 10, scale: 4, default: 1.0000 })
  tasaCambioUsd: number;

  @Column({ name: 'zona_horaria', nullable: true })
  zonaHoraria: string;

  @Column({
    type: 'enum',
    enum: EstadoPais,
    default: EstadoPais.ACTIVO,
  })
  estado: EstadoPais;

  @Column({ name: 'gerente_pais_id', nullable: true })
  gerentePaisId: number;

  @ManyToOne('Usuario', { nullable: true, eager: false })
  @JoinColumn({ name: 'gerente_pais_id' })
  gerentePais: { id: number; email: string; nombre: string; apellido: string };

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
