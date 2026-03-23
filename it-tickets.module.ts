import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ITTicketsController } from './it-tickets.controller';
import { ITTicketsService } from './it-tickets.service';
import { ITTicket } from '../../entities/it-ticket.entity';
import { ITTicketComentario } from './entities/it-ticket-comentario.entity';
import { ITTicketHistorial } from './entities/it-ticket-historial.entity';
import { Usuario } from '../../entities/usuario.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ITTicket, ITTicketComentario, ITTicketHistorial]),
    TypeOrmModule.forFeature([Usuario]),
    EmailModule,
  ],
  controllers: [ITTicketsController],
  providers: [ITTicketsService],
  exports: [ITTicketsService],
})
export class ITTicketsModule {}
