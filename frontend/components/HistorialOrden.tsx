import React, { useState, useEffect } from 'react';
import { Clock, User, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import ordenesTrabajoService from '../src/services/ordenes-trabajo.service';

interface HistorialEntry {
  id: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  comentario: string | null;
  datosAdicionales: any;
  creadoEn: string;
}

interface HistorialOrdenProps {
  ordenId: number;
}

const HistorialOrden: React.FC<HistorialOrdenProps> = ({ ordenId }) => {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, [ordenId]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const data = await ordenesTrabajoService.getHistorial(ordenId);
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEstado = (estado: string) => {
    const estados: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      ASIGNADA: 'Asignada',
      EN_PROGRESO: 'En Progreso',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return estados[estado] || estado;
  };

  const getEstadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      PENDIENTE: 'bg-gray-500',
      ASIGNADA: 'bg-blue-500',
      EN_PROGRESO: 'bg-orange-500',
      COMPLETADA: 'bg-green-500',
      CANCELADA: 'bg-red-500',
    };
    return colores[estado] || 'bg-gray-500';
  };

  const getEntradaEstilo = (entrada: HistorialEntry) => {
    if (entrada.datosAdicionales?.tipo === 'comentario') {
      return {
        card: 'bg-indigo-50 border border-indigo-200',
        dot: 'bg-indigo-400',
        texto: 'text-indigo-700',
      };
    }
    const estilos: Record<string, { card: string; dot: string; texto: string }> = {
      PENDIENTE: { card: 'bg-gray-50 border border-gray-200', dot: 'bg-gray-500', texto: 'text-gray-700' },
      ASIGNADA:  { card: 'bg-blue-50 border border-blue-200',   dot: 'bg-blue-500',   texto: 'text-blue-700' },
      EN_PROGRESO: { card: 'bg-orange-50 border border-orange-200', dot: 'bg-orange-500', texto: 'text-orange-700' },
      COMPLETADA: { card: 'bg-green-50 border border-green-200', dot: 'bg-green-500', texto: 'text-green-700' },
      CANCELADA:  { card: 'bg-red-50 border border-red-200',    dot: 'bg-red-500',    texto: 'text-red-700' },
    };
    return estilos[entrada.estadoNuevo] || { card: 'bg-gray-50 border border-gray-200', dot: 'bg-gray-500', texto: 'text-gray-700' };
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatFechaSola = (fecha: string) => {
    // Para fechas en formato YYYY-MM-DD, parsear como fecha local
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      const [year, month, day] = fecha.split('T')[0].split('-');
      const fechaLocal = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return fechaLocal.toLocaleDateString('es-MX');
    }
    return new Date(fecha).toLocaleDateString('es-MX');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mrb-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-lg font-semibold text-gray-900">Historial de la Orden</h3>
        <button className="text-gray-500 hover:text-gray-700">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="p-6">
          {historial.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay historial disponible</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* Timeline entries */}
              <div className="space-y-6">
                {historial.map((entrada) => {
                  const estilo = getEntradaEstilo(entrada);
                  return (
                    <div key={entrada.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${estilo.dot}`}></div>

                      {/* Entry content */}
                      <div className={`rounded-lg p-4 hover:shadow-md transition-shadow ${estilo.card}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {entrada.datosAdicionales?.tipo === 'comentario' ? (
                                <span className={`text-sm font-medium flex items-center gap-1 ${estilo.texto}`}>
                                  <MessageSquare size={14} />
                                  Comentario
                                </span>
                              ) : entrada.estadoAnterior && entrada.estadoAnterior !== entrada.estadoNuevo ? (
                                <span className="text-sm font-medium text-gray-600">
                                  {formatEstado(entrada.estadoAnterior)} → <span className={`font-semibold ${estilo.texto}`}>{formatEstado(entrada.estadoNuevo)}</span>
                                </span>
                              ) : (
                                <span className={`text-sm font-semibold ${estilo.texto}`}>
                                  {formatEstado(entrada.estadoNuevo)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span>{entrada.usuario.nombre} {entrada.usuario.apellido}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{formatFecha(entrada.creadoEn)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comentario */}
                        {entrada.comentario && (
                          <div className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                            <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="italic">{entrada.comentario}</p>
                          </div>
                        )}

                        {/* Datos adicionales */}
                        {entrada.datosAdicionales && Object.keys(entrada.datosAdicionales).filter(k => k !== 'tipo' && k !== 'autor').length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {entrada.datosAdicionales.asignadoA && (
                                <div>
                                  <span className="font-medium text-gray-600">Asignado a:</span>
                                  <span className="ml-1 text-gray-800">{entrada.datosAdicionales.asignadoA}</span>
                                </div>
                              )}
                              {entrada.datosAdicionales.fechaProgramada && (
                                <div>
                                  <span className="font-medium text-gray-600">Fecha programada:</span>
                                  <span className="ml-1 text-gray-800">
                                    {formatFechaSola(entrada.datosAdicionales.fechaProgramada)}
                                  </span>
                                </div>
                              )}
                              {entrada.datosAdicionales.costoEstimado && (
                                <div>
                                  <span className="font-medium text-gray-600">Costo estimado:</span>
                                  <span className="ml-1 text-gray-800">
                                    ${entrada.datosAdicionales.costoEstimado} USD
                                  </span>
                                </div>
                              )}
                              {entrada.datosAdicionales.costoReal && (
                                <div>
                                  <span className="font-medium text-gray-600">Costo real:</span>
                                  <span className="ml-1 text-gray-800">
                                    ${entrada.datosAdicionales.costoReal} USD
                                  </span>
                                </div>
                              )}
                              {entrada.datosAdicionales.calificacion && (
                                <div>
                                  <span className="font-medium text-gray-600">Calificación:</span>
                                  <span className="ml-1 text-gray-800">
                                    {entrada.datosAdicionales.calificacion}/5
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistorialOrden;
