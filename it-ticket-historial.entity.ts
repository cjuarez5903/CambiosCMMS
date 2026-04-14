import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ITTicket } from '../../../entities/it-ticket.entity';
import { Usuario } from '../../../entities/usuario.entity';

@Entity('it_ticket_historial')
export class ITTicketHistorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticket_id: number;

  @Column({
    name: 'estado_anterior',
    type: 'enum',
    enum: ['abierto', 'en_progreso', 'resuelto', 'cerrado'],
    nullable: true
  })
  estado_anterior: string;

  @Column({
    name: 'estado_nuevo',
    type: 'enum',
    enum: ['abierto', 'en_progreso', 'resuelto', 'cerrado']
  })
  estado_nuevo: string;

  @Column({ name: 'usuario_id' })
  usuario_id: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'fecha_cambio' })
  fecha_cambio: Date;

  @Column('text', { nullable: true })
  comentario: string;

  @ManyToOne(() => ITTicket, { nullable: true })
  @JoinColumn({ name: 'ticket_id', referencedColumnName: 'id' })
  ticket: ITTicket;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id', referencedColumnName: 'id' })
  usuario: Usuario;
}
