import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import ticketsService from '../services/it-tickets.service';

export type CommentNotification = {
  id: string;
  type: 'it-ticket:comment:new';
  ticketId: number;
  comentarioId: number;
  comentario: string;
  authorEmail?: string;
  createdAt: string;
  read: boolean;
};

type NotificationsContextType = {
  notifications: CommentNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function getInitialSince(): string {
  const stored = localStorage.getItem('it_notifications_since');
  const fallback = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  if (!stored) return fallback;

  const t = new Date(stored).getTime();
  if (!Number.isFinite(t) || t <= 0) return fallback;

  // Evitar que un reloj desfasado deje el since en el futuro y no entren notificaciones
  const now = Date.now();
  if (t > now + 60 * 1000) return fallback;

  return new Date(t).toISOString();
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<CommentNotification[]>([]);

  // Guardamos el último timestamp consultado para no duplicar (ref para no disparar re-renders)
  const sinceRef = useRef<string>(getInitialSince());

  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;

    let isCancelled = false;
    const intervalMs = 300000;

    const poll = async () => {
      try {
        if (document.visibilityState === 'hidden') return;

        const data = await ticketsService.obtenerNotificacionesComentarios(sinceRef.current);

        if (isCancelled) return;

        if (!Array.isArray(data)) return;

        setNotifications(prev => {
          const existing = new Set(prev.map(n => n.id));
          const incoming: CommentNotification[] = [];

          for (const item of data) {
            const ticketId = Number(item?.ticketId);
            const comentarioId = Number(item?.comentarioId);
            if (!Number.isFinite(ticketId) || !Number.isFinite(comentarioId)) continue;

            const id = `${ticketId}:${comentarioId}`;
            if (existing.has(id)) continue;

            incoming.push({
              id,
              type: 'it-ticket:comment:new',
              ticketId,
              comentarioId,
              comentario: String(item?.comentario || ''),
              authorEmail: item?.authorEmail,
              createdAt: String(item?.createdAt || new Date().toISOString()),
              read: false,
            });
          }

          if (incoming.length === 0) return prev;
          return [...incoming, ...prev].slice(0, 50);
        });

        // Avanzar since SOLO en éxito (y basado en el comentario más reciente recibido)
        const maxCreatedAt = data
          .map((x: any) => new Date(x?.createdAt || 0).getTime())
          .filter((t: number) => Number.isFinite(t) && t > 0)
          .reduce((acc: number, t: number) => Math.max(acc, t), 0);

        const nextSince = maxCreatedAt > 0 ? new Date(maxCreatedAt).toISOString() : new Date().toISOString();
        sinceRef.current = nextSince;
        localStorage.setItem('it_notifications_since', nextSince);
      } catch {
        // Silencioso para no molestar al usuario; se reintenta en el siguiente intervalo
      }
    };

    poll();
    const timer = window.setInterval(poll, intervalMs);
    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, user?.email]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications debe ser usado dentro de NotificationsProvider');
  return ctx;
}
