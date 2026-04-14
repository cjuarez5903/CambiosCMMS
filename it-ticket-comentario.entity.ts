import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ITTicket } from '../../../entities/it-ticket.entity';
import { Usuario } from '../../../entities/usuario.entity';

@Entity('it_ticket_comentarios')
export class ITTicketComentario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticket_id: number;

  @Column('text')
  comentario: string;

  @Column({ name: 'usuario_id' })
  usuario_id: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @ManyToOne(() => ITTicket, { nullable: true })
  @JoinColumn({ name: 'ticket_id', referencedColumnName: 'id' })
  ticket: ITTicket;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id', referencedColumnName: 'id' })
  usuario: Usuario;
}
