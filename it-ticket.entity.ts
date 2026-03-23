import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EstadoTicket {
  ABIERTO = 'abierto',
  EN_PROGRESO = 'en_progreso',
  RESUELTO = 'resuelto',
  CERRADO = 'cerrado',
}

export enum PrioridadTicket {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

export enum CategoriaTicket {
  SOPORTE_TECNICO = 'soporte_tecnico',
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  RED = 'red',
  ACCESO = 'acceso',
  SAP = 'sap',
  SITELINK = 'sitelink',
}

@Entity('it_tickets')
export class ITTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  titulo: string;

  @Column('text')
  descripcion: string;

  @Column({
    type: 'enum',
    enum: EstadoTicket,
    default: EstadoTicket.ABIERTO,
  })
  estado: EstadoTicket;

  @Column({
    type: 'enum',
    enum: PrioridadTicket,
    default: PrioridadTicket.MEDIA,
  })
  prioridad: PrioridadTicket;

  @Column({
    type: 'enum',
    enum: CategoriaTicket,
    default: CategoriaTicket.SOPORTE_TECNICO,
  })
  categoria: CategoriaTicket;

  @Column({ length: 255 })
  solicitante: string;

  @Column({ length: 255, nullable: true })
  asignado_a?: string;

  @Column({ name: 'fecha_creacion', type: 'datetime' })
  fecha_creacion: Date;

  @Column({ name: 'fecha_actualizacion', type: 'datetime', nullable: true })
  fecha_actualizacion?: Date;

  @Column({ name: 'fecha_resolucion', type: 'datetime', nullable: true })
  fecha_resolucion?: Date;

  @Column({ name: 'creado_por', nullable: true })
  creado_por?: number;

  @Column({ name: 'actualizado_por', nullable: true })
  actualizado_por?: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
