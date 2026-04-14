import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ITTicketsController } from './it-tickets.controller';
import { ITTicketsService } from './it-tickets.service';
import { Usuario } from '../../entities/usuario.entity';
import { ITTicket } from './entities/it-ticket.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, ITTicket]), EmailModule],
  controllers: [ITTicketsController],
  providers: [ITTicketsService],
  exports: [ITTicketsService],
})
export class ITTicketsModule {}
