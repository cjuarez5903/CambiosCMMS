import React from 'react';
import { Edit2, Trash2, UserPlus, RotateCcw, MessageSquare, History } from 'lucide-react';
import { ITTicket } from '../src/services/it-tickets.service';

interface ITMobileTicketCardProps {
  ticket: ITTicket;
  canEditTickets: boolean;
  canAssignTickets: boolean;
  canChangeStatus: boolean;
  canDeleteTickets: boolean;
  canViewComments: boolean;
  canViewHistory: boolean;
  onEdit: (ticket: ITTicket) => void;
  onAssign: (ticketId: number) => void;
  onStatusChange: (ticketId: number, currentStatus: string) => void;
  onDelete: (ticketId: number) => void;
  onToggleComments: (ticketId: number) => void;
  onToggleHistory: (ticketId: number) => void;
  getEstadoIcon: (estado: string) => React.ReactNode;
  getPrioridadColor: (prioridad: string) => string;
}

const ITMobileTicketCard: React.FC<ITMobileTicketCardProps> = ({
  ticket,
  canEditTickets,
  canAssignTickets,
  canChangeStatus,
  canDeleteTickets,
  canViewComments,
  canViewHistory,
  onEdit,
  onAssign,
  onStatusChange,
  onDelete,
  onToggleComments,
  onToggleHistory,
  getEstadoIcon,
  getPrioridadColor
}) => {
  return (
    <div className="it-ticket-card">
      {/* Header con ID, título y prioridad */}
      <div className="it-ticket-header">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">#{ticket.id}</span>
          <span className={`it-ticket-badge ${getPrioridadColor(ticket.prioridad)}`}>
            {ticket.prioridad.toUpperCase()}
          </span>
        </div>
        <h3 className="it-ticket-title">{ticket.titulo}</h3>
      </div>
      
      {/* Información del ticket */}
      <div className="space-y-2">
        <div className="it-ticket-meta">
          <div className="flex items-center gap-1">
            {getEstadoIcon(ticket.estado)}
            <span className="text-sm text-gray-900 capitalize">
              {ticket.estado.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {new Date(ticket.fecha_creacion).toLocaleDateString()}
          </div>
        </div>
        
        <div className="text-sm text-gray-700">
          <p><strong>Solicitante:</strong> {ticket.solicitante}</p>
          {ticket.asignado_a && (
            <p><strong>Asignado a:</strong> {ticket.asignado_a}</p>
          )}
        </div>
        
        {/* Acciones */}
        <div className="it-ticket-actions">
          {canEditTickets && (
            <button
              onClick={() => onEdit(ticket)}
              className="it-ticket-action-btn text-mrb-blue hover:text-mrb-blue/80"
              title="Editar"
            >
              <Edit2 size={16} />
            </button>
          )}
          {canAssignTickets && (
            <button
              onClick={() => onAssign(ticket.id)}
              className="it-ticket-action-btn text-green-600 hover:text-green-800"
              title="Asignar"
            >
              <UserPlus size={16} />
            </button>
          )}
          {canChangeStatus && (
            <button
              onClick={() => onStatusChange(ticket.id, ticket.estado)}
              className="it-ticket-action-btn text-orange-600 hover:text-orange-800"
              title="Cambiar estado"
            >
              <RotateCcw size={16} />
            </button>
          )}
          {canDeleteTickets && (
            <button
              onClick={() => onDelete(ticket.id)}
              className="it-ticket-action-btn text-red-600 hover:text-red-800"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          )}
          {canViewComments && (
            <button
              onClick={() => onToggleComments(ticket.id)}
              className="it-ticket-action-btn text-gray-600 hover:text-gray-800"
              title="Comentarios"
            >
              <MessageSquare size={16} />
            </button>
          )}
          {canViewHistory && (
            <button
              onClick={() => onToggleHistory(ticket.id)}
              className="it-ticket-action-btn text-purple-600 hover:text-purple-800"
              title="Historial"
            >
              <History size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ITMobileTicketCard;
