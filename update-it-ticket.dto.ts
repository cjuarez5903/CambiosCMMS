import { PartialType } from '@nestjs/mapped-types';
import { CreateITTicketDto } from './create-it-ticket.dto';

export class UpdateITTicketDto extends PartialType(CreateITTicketDto) {}
