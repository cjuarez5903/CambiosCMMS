import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('orden_trabajo_comentarios')
export class OrdenTrabajoComentario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'orden_id' })
  ordenId: number;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}
