import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITTicket } from './entities/it-ticket.entity';
import { CreateITTicketDto } from './dto/create-it-ticket.dto';
import { UpdateITTicketDto } from './dto/update-it-ticket.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import * as mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { EmailService } from '../email/email.service';

config();

const configService = {
  get: (key: string) => process.env[key],
};

// Crear pool de conexiones MySQL
export const pool = mysql.createPool({
  host: configService.get('DB_HOST'),
  port: parseInt(configService.get('DB_PORT')) || 3306,
  user: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
});

@Injectable()
export class ITTicketsService {
  constructor(
    @InjectRepository(ITTicket)
    private readonly itTicketRepository: Repository<ITTicket>,
    private readonly emailService: EmailService,
  ) {}

  async obtenerEstadisticas(params?: { asignado_a?: string }, user?: any): Promise<any> {
    try {
      console.log('🔍 obtenerEstadisticas llamado con params:', params);
      console.log('🔍 obtenerEstadisticas llamado con user:', user);
      
      // Determinar si debe filtrar por asignado_a
      const isAdmin = user?.permisos?.todo === true && user?.rol?.nombre === 'Administrador';
      const esAdminIT = user?.rol?.nombre === 'Administrador IT';
      const esTecnicoIT = user?.rol?.nombre === 'Técnico IT';
      
      console.log('🔍 Roles detectados:', { isAdmin, esAdminIT, esTecnicoIT });
      
      // Solo Administrador y Administrador IT ven todas las estadísticas
      // Técnico IT ve solo sus estadísticas personales
      const usarFiltroAsignado = !isAdmin && !esAdminIT && params?.asignado_a;
      
      const asignadoFilter = usarFiltroAsignado ? 'AND asignado_a = ?' : '';
      const asignadoParam = usarFiltroAsignado ? params?.asignado_a : null;
      
      console.log('🔍 Filtros:', { usarFiltroAsignado, asignadoFilter, asignadoParam });

      // Estadísticas generales
      const estadisticasQuery = `
        SELECT 
          COUNT(CASE WHEN estado = 'abierto' THEN 1 END) as abiertos,
          COUNT(CASE WHEN estado = 'en_progreso' THEN 1 END) as enProgreso,
          COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
          COUNT(CASE WHEN estado = 'cerrado' THEN 1 END) as cerrados,
          COUNT(CASE WHEN prioridad = 'critica' THEN 1 END) as criticos,
          COUNT(CASE WHEN DATE(fecha_actualizacion) = CURDATE() AND estado IN ('resuelto', 'cerrado') THEN 1 END) as resueltosHoy,
          COUNT(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 END) as ticketsAsignados,
          COUNT(*) as totalTickets
        FROM it_tickets
        WHERE 1=1 ${asignadoFilter}
      `;

      console.log('🔍 Estadísticas Query:', estadisticasQuery);
      console.log('🔍 Estadísticas Params:', asignadoParam ? [asignadoParam] : []);

      const [estadisticasRows] = await pool.query(estadisticasQuery, asignadoParam ? [asignadoParam] : []) as [any[], any];
      const estadisticas = estadisticasRows[0];
      
      console.log('🔍 Estadísticas generales:', estadisticas);

      // Estadísticas por categoría - vista cuando no hay filtro, tabla directa cuando hay filtro
      const categoriasQuery = usarFiltroAsignado
        ? `SELECT categoria, COUNT(*) as value
           FROM it_tickets
           WHERE categoria IS NOT NULL AND categoria != ''
           ${asignadoFilter}
           GROUP BY categoria
           ORDER BY value DESC`
        : `SELECT categoria, SUM(cantidad) as value
           FROM v_it_tickets_por_categoria_estado
           WHERE categoria IS NOT NULL AND categoria != ''
           GROUP BY categoria
           ORDER BY value DESC`;
      console.log('🔍 Categorías Query:', categoriasQuery);
      console.log('🔍 Categorías Params:', asignadoParam ? [asignadoParam] : []);
      const [categoriasRows] = await pool.query(categoriasQuery, asignadoParam ? [asignadoParam] : []) as [any[], any];
      console.log('🔍 Categorías Result:', categoriasRows);

      // Estadísticas por prioridad - simplificado
      const prioridadesQuery = `
        SELECT prioridad, COUNT(*) as value
        FROM it_tickets
        WHERE prioridad IS NOT NULL AND prioridad != ''
        ${asignadoFilter}
        GROUP BY prioridad
        ORDER BY 
          CASE prioridad
            WHEN 'critica' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baja' THEN 4
          END
      `;
      console.log('🔍 Prioridades Query:', prioridadesQuery);
      const [prioridadesRows] = await pool.query(prioridadesQuery, asignadoParam ? [asignadoParam] : []) as [any[], any];
      console.log('🔍 Prioridades Result:', prioridadesRows);

      // Procesar datos para el frontend
      const porCategoria = {
        soporte_tecnico: categoriasRows.find((c: any) => c.categoria === 'soporte_tecnico')?.value || 0,
        planta_telefonica: categoriasRows.find((c: any) => c.categoria === 'planta_telefonica')?.value || 0,
        office_correo: categoriasRows.find((c: any) => c.categoria === 'office_correo')?.value || 0,
        bitrix: categoriasRows.find((c: any) => c.categoria === 'bitrix')?.value || 0,
        callguru: categoriasRows.find((c: any) => c.categoria === 'callguru')?.value || 0,
        sap: categoriasRows.find((c: any) => c.categoria === 'sap')?.value || 0,
        sitelink: categoriasRows.find((c: any) => c.categoria === 'sitelink')?.value || 0,
        red_internet: categoriasRows.find((c: any) => c.categoria === 'red_internet')?.value || 0,
        acceso_credenciales: categoriasRows.find((c: any) => c.categoria === 'acceso_credenciales')?.value || 0,
        otro: categoriasRows.find((c: any) => c.categoria === 'otro')?.value || 0,
      };

      const porPrioridad = {
        critica: prioridadesRows.find((p: any) => p.prioridad === 'critica')?.value || 0,
        alta: prioridadesRows.find((p: any) => p.prioridad === 'alta')?.value || 0,
        media: prioridadesRows.find((p: any) => p.prioridad === 'media')?.value || 0,
        baja: prioridadesRows.find((p: any) => p.prioridad === 'baja')?.value || 0,
      };

      console.log('🔍 porCategoria procesado:', porCategoria);
      console.log('🔍 porPrioridad procesado:', porPrioridad);

      const result = {
        abiertos: estadisticas.abiertos || 0,
        enProgreso: estadisticas.enProgreso || 0,
        resueltos: estadisticas.resueltos || 0,
        cerrados: estadisticas.cerrados || 0,
        criticos: estadisticas.criticos || 0,
        resueltosHoy: estadisticas.resueltosHoy || 0,
        ticketsAsignados: estadisticas.ticketsAsignados || 0,
        totalTickets: estadisticas.totalTickets || 0,
        porCategoria,
        porPrioridad,
      };

      console.log('🔍 Resultado final:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error en obtenerEstadisticas:', error);
      return {
        abiertos: 0,
        enProgreso: 0,
        resueltos: 0,
        cerrados: 0,
        criticos: 0,
        resueltosHoy: 0,
        ticketsAsignados: 0,
        totalTickets: 0,
        porCategoria: {
          soporte_tecnico: 0,
          hardware: 0,
          software: 0,
          red: 0,
          acceso: 0,
          sap: 0,
          sitelink: 0,
        },
        porPrioridad: {
          critica: 0,
          alta: 0,
          media: 0,
          baja: 0,
        },
      };
    }
  }

  async findAll(paginationDto: PaginationDto, busqueda?: string, asignado_a?: string, user?: any, estado?: string, prioridad?: string, categoria?: string, estado_excluir?: string, estado_incluir?: string, sin_asignar?: boolean, con_asignar?: boolean): Promise<any> {
    try {
      const { pagina, porPagina } = paginationDto;
      const skip = (pagina - 1) * porPagina;

      // Obtener rol real desde BD (el JWT solo trae sub/email/rolId)
      const userId = user?.sub ?? user?.id ?? user?.userId;
      const rol = userId ? await this.getRolFromDB(Number(userId)) : null;
      const permisos = rol?.permisos || {};

      let whereClause = '';
      let params: any[] = [];

      // Administrador y Administrador IT ven todos los tickets
      const canVerTodos = rol?.nombre === 'Administrador IT' || rol?.nombre === 'Administrador';
      const esTecnicoIT = rol?.nombre === 'Técnico IT';
      const esUsuarioIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;

      if (canVerTodos) {
        // no filter
      } else if (esTecnicoIT) {
        whereClause = ' WHERE asignado_a = ?';
        params.push(user?.email);
      } else {
        // Todos los demás (incluido Administrador sistema) — solo los que crearon
        whereClause = ' WHERE solicitante = ?';
        params.push(user?.email);
      }
      
      // Agregar filtros adicionales
      const filtros = [];
      
      if (busqueda) {
        filtros.push('(titulo LIKE ? OR descripcion LIKE ? OR solicitante LIKE ?)');
        params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
      }
      
      if (estado) {
        filtros.push('estado = ?');
        params.push(estado);
      }
      
      if (prioridad) {
        filtros.push('prioridad = ?');
        params.push(prioridad);
      }
      
      if (categoria) {
        filtros.push('categoria = ?');
        params.push(categoria);
      }
      
      if (estado_excluir) {
        const estadosExcluir = estado_excluir.split(',');
        filtros.push(`estado NOT IN (${estadosExcluir.map(() => '?').join(',')})`);
        params.push(...estadosExcluir);
      }
      
      if (estado_incluir) {
        const estadosIncluir = estado_incluir.split(',');
        filtros.push(`estado IN (${estadosIncluir.map(() => '?').join(',')})`);
        params.push(...estadosIncluir);
      }
      
      if (sin_asignar) {
        filtros.push('(asignado_a IS NULL OR asignado_a = "")');
      }
      
      if (con_asignar) {
        filtros.push('(asignado_a IS NOT NULL AND asignado_a != "")');
      }
      
      // Combinar filtros con la cláusula WHERE existente
      if (filtros.length > 0) {
        if (whereClause) {
          whereClause += ' AND ' + filtros.join(' AND ');
        } else {
          whereClause = ' WHERE ' + filtros.join(' AND ');
        }
      }
      
      // Construir consulta SQL completa
      const sqlQuery = `
        SELECT id, titulo, descripcion, estado, prioridad, categoria, solicitante, asignado_a, fecha_creacion, fecha_actualizacion, fecha_resolucion, creado_por, actualizado_por
        FROM it_tickets${whereClause}
        ORDER BY fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      
      // Agregar parámetros de paginación
      params.push(porPagina, skip);

      // Ejecutar consulta usando el pool de MySQL directo
      const connection = await pool.getConnection();
      const [tickets] = await connection.query(sqlQuery, params);
      
      console.log('🔍 SQL Query:', sqlQuery);
      console.log('🔍 SQL Params:', params);
      console.log('🔍 Raw tickets from DB:', tickets);
      console.log('🔍 Tickets length:', Array.isArray(tickets) ? tickets.length : 'Not an array');

      // Mapear resultados al formato ITTicket
      const ticketsFormateados = (tickets as any[]).map(ticket => ({
        id: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion,
        estado: ticket.estado,
        prioridad: ticket.prioridad,
        categoria: ticket.categoria,
        solicitante: ticket.solicitante,
        asignado_a: ticket.asignado_a,
        fecha_creacion: ticket.fecha_creacion,
        fecha_actualizacion: ticket.fecha_actualizacion,
        fecha_resolucion: ticket.fecha_resolucion,
        creado_por: ticket.creado_por,
        actualizado_por: ticket.actualizado_por
      }));
      
      console.log('🔍 Formatted tickets:', ticketsFormateados);
      console.log('🔍 Formatted tickets length:', ticketsFormateados?.length);

      // Conteo total con las mismas condiciones de acceso
      let countParams: any[] = [];
      let countConditions = '';
      if (canVerTodos || esTecnicoIT) {
        // no filter
      } else if (esUsuarioIT) {
        countConditions = ' WHERE asignado_a = ?';
        countParams.push(user?.email);
      } else {
        countConditions = ' WHERE solicitante = ?';
        countParams.push(user?.email);
      }

      // Aplicar mismos filtros al conteo
      const countFiltros = [];
      if (busqueda) {
        countFiltros.push('(titulo LIKE ? OR descripcion LIKE ? OR solicitante LIKE ?)');
        countParams.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
      }
      
      if (estado) {
        countFiltros.push('estado = ?');
        countParams.push(estado);
      }
      
      if (prioridad) {
        countFiltros.push('prioridad = ?');
        countParams.push(prioridad);
      }
      
      if (categoria) {
        countFiltros.push('categoria = ?');
        countParams.push(categoria);
      }
      
      if (estado_excluir) {
        const estadosExcluir = estado_excluir.split(',');
        countFiltros.push(`estado NOT IN (${estadosExcluir.map(() => '?').join(',')})`);
        countParams.push(...estadosExcluir);
      }
      
      if (estado_incluir) {
        const estadosIncluir = estado_incluir.split(',');
        countFiltros.push(`estado IN (${estadosIncluir.map(() => '?').join(',')})`);
        countParams.push(...estadosIncluir);
      }
      
      if (sin_asignar) {
        countFiltros.push('(asignado_a IS NULL OR asignado_a = "")');
      }
      
      if (con_asignar) {
        countFiltros.push('(asignado_a IS NOT NULL AND asignado_a != "")');
      }
      
      if (countFiltros.length > 0) {
        if (countConditions) {
          countConditions += ' AND ' + countFiltros.join(' AND ');
        } else {
          countConditions = ' WHERE ' + countFiltros.join(' AND ');
        }
      }

      const countQuery = `SELECT COUNT(*) as total FROM it_tickets${countConditions}`;
      
      const [countResult] = await connection.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      connection.release();

      const response = {
        datos: ticketsFormateados || [],
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina)
      };
      
      console.log('🔍 Final response:', response);
      
      return response;
      
    } catch (error) {
      console.error('❌ Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<ITTicket> {
    const connection = await pool.getConnection();
    const [tickets] = await connection.query<any[]>(
      'SELECT id, titulo, descripcion, estado, prioridad, categoria, solicitante, asignado_a, fecha_creacion, fecha_actualizacion, fecha_resolucion, creado_por, actualizado_por FROM it_tickets WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return null;
    }
    
    const ticket = tickets[0];
    return {
      id: ticket.id,
      titulo: ticket.titulo,
      descripcion: ticket.descripcion,
      estado: ticket.estado,
      prioridad: ticket.prioridad,
      categoria: ticket.categoria,
      solicitante: ticket.solicitante,
      asignado_a: ticket.asignado_a,
      fecha_creacion: ticket.fecha_creacion,
      fecha_actualizacion: ticket.fecha_actualizacion,
      fecha_resolucion: ticket.fecha_resolucion,
      creado_por: ticket.creado_por,
      actualizado_por: ticket.actualizado_por
    } as ITTicket;
  }

  async cambiarEstado(id: number, estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado', user?: any): Promise<ITTicket> {
    // Debug: Ver qué viene en el user
    console.log('🔍 User en cambiarEstado:', JSON.stringify(user, null, 2));

    const usuarioId = await this.resolveUsuarioId(user);
    if (!usuarioId) {
      console.log('❌ No se pudo resolver usuarioId en cambiarEstado');
    }
    
    // Obtener el ticket actual para saber el estado anterior
    const ticket = await this.findOne(id);
    const estadoAnterior = ticket.estado;
    
    // Actualizar el campo actualizado_por con el ID del usuario
    const updateData: any = { estado };
    if (usuarioId) {
      updateData.actualizado_por = usuarioId;
      console.log('✅ actualizado_por seteado a:', usuarioId);
    } else {
      console.log('❌ usuarioId no encontrado');
    }
    
    await this.itTicketRepository.update(id, updateData);
    const ticketActualizado = await this.findOne(id);

    return ticketActualizado;
  }

  private async resolveUsuarioId(user?: any): Promise<number | null> {
    if (!user) return null;

    const directId = user?.id ?? user?.userId ?? user?.sub;
    if (directId && typeof directId === 'number') {
      return directId;
    }

    // Buscar en la base de datos por email
    const userEmail = (user?.email || '').trim();
    if (!userEmail) return null;

    try {
      const [rows] = await pool.query<any[]>(
        'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
        [userEmail]
      );
      return rows?.[0]?.id || null;
    } catch (error) {
      console.error('Error al resolver usuarioId:', error);
      return null;
    }
  }

  private async getRolFromDB(userId: number): Promise<any> {
    try {
      const [rows] = await pool.query<any[]>(
        'SELECT r.* FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?',
        [userId]
      );
      return rows?.[0] || null;
    } catch (error) {
      console.error('Error al obtener rol desde BD:', error);
      return null;
    }
  }

  async obtenerHistorial(id: number): Promise<any[]> {
    try {
      const connection = await pool.getConnection();
      const [historial] = await connection.query<any[]>(
        `SELECT h.*, u.nombre as nombre_usuario 
         FROM it_ticket_historial h 
         LEFT JOIN usuarios u ON u.id = h.usuario_id 
         WHERE h.ticket_id = ? 
         ORDER BY h.fecha_cambio DESC`,
        [id]
      );
      connection.release();
      
      return historial || [];
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }

  async obtenerEstadisticasPorTecnico(user: any): Promise<any> {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      if (!userEmail) {
        return {
          abiertos: 0,
          enProgreso: 0,
          resueltos: 0,
          cerrados: 0,
          criticos: 0,
          resueltosHoy: 0,
          ticketsAsignados: 0,
          totalTickets: 0,
          porCategoria: {
            soporte_tecnico: 0,
            hardware: 0,
            software: 0,
            red: 0,
            acceso: 0,
            sap: 0,
            sitelink: 0,
          },
          porPrioridad: {
            critica: 0,
            alta: 0,
            media: 0,
            baja: 0,
          },
        };
      }

      // Consultar it_tickets directamente (evita dependencia del schema de la vista)
      const [rows] = await pool.query<any[]>(
        `SELECT
          COUNT(CASE WHEN estado = 'abierto' THEN 1 END) as abiertos,
          COUNT(CASE WHEN estado = 'en_progreso' THEN 1 END) as enProgreso,
          COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
          COUNT(CASE WHEN estado = 'cerrado' THEN 1 END) as cerrados,
          COUNT(CASE WHEN prioridad = 'critica' THEN 1 END) as criticos,
          COUNT(CASE WHEN DATE(fecha_actualizacion) = CURDATE() AND estado IN ('resuelto', 'cerrado') THEN 1 END) as resueltosHoy,
          COUNT(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 END) as ticketsAsignados,
          COUNT(*) as totalTickets
        FROM it_tickets
        WHERE asignado_a = ? OR solicitante = ?`,
        [userEmail, userEmail]
      );
      const statsData = rows[0];

      // Estadísticas por categoría
      const [categoriasRows] = await pool.query<any[]>(
        `SELECT categoria, COUNT(*) as value
        FROM it_tickets
        WHERE (asignado_a = ? OR solicitante = ?) AND categoria IS NOT NULL AND categoria != ''
        GROUP BY categoria
        ORDER BY value DESC`,
        [userEmail, userEmail]
      );

      // Estadísticas por prioridad
      const [prioridadesRows] = await pool.query<any[]>(
        `SELECT prioridad, COUNT(*) as value
        FROM it_tickets
        WHERE (asignado_a = ? OR solicitante = ?) AND prioridad IS NOT NULL AND prioridad != ''
        GROUP BY prioridad
        ORDER BY
          CASE prioridad
            WHEN 'critica' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baja' THEN 4
          END`,
        [userEmail, userEmail]
      );

      const porCategoria = {
        soporte_tecnico: categoriasRows.find((c: any) => c.categoria === 'soporte_tecnico')?.value || 0,
        planta_telefonica: categoriasRows.find((c: any) => c.categoria === 'planta_telefonica')?.value || 0,
        office_correo: categoriasRows.find((c: any) => c.categoria === 'office_correo')?.value || 0,
        bitrix: categoriasRows.find((c: any) => c.categoria === 'bitrix')?.value || 0,
        callguru: categoriasRows.find((c: any) => c.categoria === 'callguru')?.value || 0,
        sap: categoriasRows.find((c: any) => c.categoria === 'sap')?.value || 0,
        sitelink: categoriasRows.find((c: any) => c.categoria === 'sitelink')?.value || 0,
        red_internet: categoriasRows.find((c: any) => c.categoria === 'red_internet')?.value || 0,
        acceso_credenciales: categoriasRows.find((c: any) => c.categoria === 'acceso_credenciales')?.value || 0,
        otro: categoriasRows.find((c: any) => c.categoria === 'otro')?.value || 0,
      };

      const porPrioridad = {
        critica: prioridadesRows.find((p: any) => p.prioridad === 'critica')?.value || 0,
        alta: prioridadesRows.find((p: any) => p.prioridad === 'alta')?.value || 0,
        media: prioridadesRows.find((p: any) => p.prioridad === 'media')?.value || 0,
        baja: prioridadesRows.find((p: any) => p.prioridad === 'baja')?.value || 0,
      };

      return {
        abiertos: statsData.abiertos || 0,
        enProgreso: statsData.enProgreso || 0,
        resueltos: statsData.resueltos || 0,
        cerrados: statsData.cerrados || 0,
        criticos: statsData.criticos || 0,
        resueltosHoy: statsData.resueltosHoy || 0,
        ticketsAsignados: statsData.ticketsAsignados || 0,
        totalTickets: statsData.totalTickets || 0,
        porCategoria,
        porPrioridad,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas por técnico:', error);
      return {
        abiertos: 0,
        enProgreso: 0,
        resueltos: 0,
        cerrados: 0,
        criticos: 0,
        resueltosHoy: 0,
        ticketsAsignados: 0,
        totalTickets: 0,
        porCategoria: {
          soporte_tecnico: 0,
          hardware: 0,
          software: 0,
          red: 0,
          acceso: 0,
          sap: 0,
          sitelink: 0,
        },
        porPrioridad: {
          critica: 0,
          alta: 0,
          media: 0,
          baja: 0,
        },
      };
    }
  }

  async obtenerConteoHistorial(ids?: string, user?: any): Promise<any> {
    try {
      if (!ids) return {};
      
      const idsArray = ids.split(',').map(id => id.trim()).filter(id => id);
      if (idsArray.length === 0) return {};

      const placeholders = idsArray.map(() => '?').join(',');
      const params: any[] = [...idsArray];
      
      let sql = `
        SELECT h.ticket_id AS ticketId, COUNT(*) as conteo 
        FROM it_ticket_historial h
        INNER JOIN it_tickets t ON t.id = h.ticket_id
        WHERE h.ticket_id IN (${placeholders})
      `;
      
      // Verificar si el usuario tiene permiso para ver historial
      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;
      
      if (!isAdmin && !isIT) {
        sql += ` AND (LOWER(t.solicitante) = ? OR LOWER(t.asignado_a) = ?) `;
        params.push(user?.email, user?.email);
      }

      sql += ` GROUP BY h.ticket_id `;
      
      const connection = await pool.getConnection();
      const [results] = await connection.query(sql, params) as [any[], any];
      connection.release();
      
      const result: any = {};
      (results as any[]).forEach((row: any) => {
        result[String(row.ticketId)] = row.conteo;
      });
      
      return result;
    } catch (error) {
      console.error('Error al obtener conteo de historial:', error);
      return {};
    }
  }

  async create(createITTicketDto: CreateITTicketDto, user?: any): Promise<any> {
    try {
      const usuarioId = await this.resolveUsuarioId(user);
      
      // Agregar creado_por si tenemos el usuario
      if (usuarioId) {
        (createITTicketDto as any).creado_por = usuarioId;
      }

      const connection = await pool.getConnection();
      const [result] = await connection.query(
        'INSERT INTO it_tickets (titulo, descripcion, estado, prioridad, categoria, solicitante, asignado_a, fecha_creacion, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
        [
          createITTicketDto.titulo,
          createITTicketDto.descripcion,
          createITTicketDto.estado || 'abierto',
          createITTicketDto.prioridad,
          createITTicketDto.categoria,
          createITTicketDto.solicitante,
          createITTicketDto.asignado_a,
          usuarioId
        ]
      );
      connection.release();

      const ticketId = (result as any).insertId;
      
      // Registrar en historial
      await this.guardarHistorial(ticketId, null, createITTicketDto.estado || 'abierto', usuarioId, 'Ticket creado');

      return { id: ticketId, ...createITTicketDto };
    } catch (error) {
      console.error('Error al crear ticket:', error);
      throw error;
    }
  }

  async findAllForDashboard(paginationDto: any, busqueda?: string, user?: any): Promise<any> {
    try {
      const { pagina, porPagina } = paginationDto;
      const skip = (pagina - 1) * porPagina;

      const connection = await pool.getConnection();
      const [tickets] = await connection.query(
        `SELECT id, titulo, descripcion, estado, prioridad, categoria, solicitante, asignado_a, fecha_creacion, fecha_actualizacion, fecha_resolucion, creado_por, actualizado_por
         FROM it_tickets
         WHERE titulo LIKE ? OR descripcion LIKE ? OR solicitante LIKE ?
         ORDER BY fecha_creacion DESC
         LIMIT ? OFFSET ?`,
        [`%${busqueda || ''}%`, `%${busqueda || ''}%`, `%${busqueda || ''}%`, porPagina, skip]
      ) as [any[], any];
      
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM it_tickets WHERE titulo LIKE ? OR descripcion LIKE ? OR solicitante LIKE ?`,
        [`%${busqueda || ''}%`, `%${busqueda || ''}%`, `%${busqueda || ''}%`]
      ) as [any[], any];
      
      connection.release();

      const total = countResult[0]?.total || 0;

      return {
        datos: tickets,
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina)
      };
    } catch (error) {
      console.error('Error en findAllForDashboard:', error);
      throw error;
    }
  }

  async obtenerNotificacionesComentarios(since?: string, user?: any): Promise<any[]> {
    try {
      const connection = await pool.getConnection();
      const [comentarios] = await connection.query(
        `SELECT c.*, u.nombre as nombre_usuario, t.solicitante, t.asignado_a
         FROM it_ticket_comentarios c
         JOIN usuarios u ON u.id = c.usuario_id
         JOIN it_tickets t ON t.id = c.ticket_id
         WHERE c.fecha_creacion >= ?
         ORDER BY c.fecha_creacion DESC`,
        [since || new Date(Date.now() - 24 * 60 * 60 * 1000)] // Últimas 24 horas por defecto
      ) as [any[], any];
      connection.release();
      
      return comentarios || [];
    } catch (error) {
      console.error('Error al obtener notificaciones de comentarios:', error);
      return [];
    }
  }

  async update(id: number, updateITTicketDto: UpdateITTicketDto): Promise<any> {
    try {
      const connection = await pool.getConnection();
      await connection.query(
        'UPDATE it_tickets SET titulo = ?, descripcion = ?, estado = ?, prioridad = ?, categoria = ?, solicitante = ?, asignado_a = ?, fecha_actualizacion = NOW() WHERE id = ?',
        [
          updateITTicketDto.titulo,
          updateITTicketDto.descripcion,
          updateITTicketDto.estado,
          updateITTicketDto.prioridad,
          updateITTicketDto.categoria,
          updateITTicketDto.solicitante,
          updateITTicketDto.asignado_a,
          id
        ]
      );
      connection.release();
      
      return await this.findOne(id);
    } catch (error) {
      console.error('Error al actualizar ticket:', error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const connection = await pool.getConnection();
      await connection.query('DELETE FROM it_tickets WHERE id = ?', [id]);
      connection.release();
    } catch (error) {
      console.error('Error al eliminar ticket:', error);
      throw error;
    }
  }

  async asignarTicket(id: number, asignado_a: string, user?: any): Promise<any> {
    try {
      const usuarioId = await this.resolveUsuarioId(user);
      const ticket = await this.findOne(id);
      const asignadoAnterior = ticket?.asignado_a || '';
      
      const connection = await pool.getConnection();
      await connection.query(
        'UPDATE it_tickets SET asignado_a = ?, actualizado_por = ?, fecha_actualizacion = NOW() WHERE id = ?',
        [asignado_a, usuarioId, id]
      );
      connection.release();

      if (asignadoAnterior !== asignado_a && usuarioId) {
        await this.guardarHistorial(
          id,
          ticket?.estado,
          ticket?.estado,
          usuarioId,
          `Asignación cambiada de "${asignadoAnterior || 'sin asignar'}" a "${asignado_a || 'sin asignar'}"`,
        );
      }

      return await this.findOne(id);
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      throw error;
    }
  }

  async agregarComentario(id: number, comentario: string, user?: any): Promise<any> {
    try {
      const usuarioId = await this.resolveUsuarioId(user);
      if (!usuarioId) {
        throw new Error('Usuario inválido para comentario');
      }

      const connection = await pool.getConnection();
      const [result] = await connection.query(
        'INSERT INTO it_ticket_comentarios (ticket_id, comentario, usuario_id, fecha_creacion) VALUES (?, ?, ?, NOW())',
        [id, comentario, usuarioId]
      );
      connection.release();

      const comentarioId = (result as any).insertId;
      const autorEmail = user?.email;

      setImmediate(async () => {
        try {
          const conn2 = await pool.getConnection();
          const [infoRows] = await conn2.query(
            `SELECT t.titulo, t.solicitante, t.asignado_a,
                    CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre
             FROM it_tickets t
             JOIN usuarios u ON u.id = ?
             WHERE t.id = ?`,
            [usuarioId, id]
          ) as [any[], any];
          conn2.release();

          const info = infoRows[0];
          if (!info) return;

          const correos = [info.solicitante, info.asignado_a]
            .filter((e: string) => e && e !== autorEmail);
          if (correos.length === 0) return;

          await this.emailService.enviarComentarioTicketIT({
            ticketId: id,
            titulo: info.titulo,
            comentario,
            autor: info.autor_nombre,
            correos,
          });
        } catch (e) {
          console.error('Error enviando email de comentario IT:', e?.message);
        }
      });

      return { id: comentarioId, ticket_id: id, comentario, usuario_id: usuarioId };
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      throw error;
    }
  }

  async obtenerConteoComentarios(ids?: string, user?: any): Promise<any> {
    try {
      if (!ids) return {};
      
      const idsArray = ids.split(',').map(id => id.trim()).filter(id => id);
      if (idsArray.length === 0) return {};

      const placeholders = idsArray.map(() => '?').join(',');
      const params: any[] = [...idsArray];
      
      let sql = `
        SELECT c.ticket_id AS ticketId, COUNT(*) as conteo 
        FROM it_ticket_comentarios c
        INNER JOIN it_tickets t ON t.id = c.ticket_id
        WHERE c.ticket_id IN (${placeholders})
      `;
      
      // Verificar si el usuario tiene permiso para ver comentarios
      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;
      
      if (!isAdmin && !isIT) {
        sql += ` AND (LOWER(t.solicitante) = ? OR LOWER(t.asignado_a) = ?) `;
        params.push(user?.email, user?.email);
      }

      sql += ` GROUP BY c.ticket_id `;
      
      const connection = await pool.getConnection();
      const [results] = await connection.query(sql, params) as [any[], any];
      connection.release();
      
      const result: any = {};
      (results as any[]).forEach((row: any) => {
        result[String(row.ticketId)] = row.conteo;
      });
      
      return result;
    } catch (error) {
      console.error('Error al obtener conteo de comentarios:', error);
      return {};
    }
  }

  async obtenerComentariosConPermiso(id: number, userEmail: string, user?: any): Promise<any[]> {
    try {
      const connection = await pool.getConnection();
      const [comentarios] = await connection.query(
        `SELECT c.*, u.nombre as nombre_usuario, u.email as usuario_email
         FROM it_ticket_comentarios c
         JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.ticket_id = ?
         ORDER BY c.fecha_creacion ASC`,
        [id]
      ) as [any[], any];
      connection.release();
      
      return comentarios || [];
    } catch (error) {
      console.error('Error al obtener comentarios con permiso:', error);
      return [];
    }
  }

  private async guardarHistorial(
    ticketId: number, 
    estadoAnterior: string, 
    estadoNuevo: string, 
    usuarioId: number, 
    comentario?: string
  ): Promise<void> {
    try {
      const connection = await pool.getConnection();
      await connection.query(
        'INSERT INTO it_ticket_historial (ticket_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_cambio) VALUES (?, ?, ?, ?, ?, NOW())',
        [ticketId, estadoAnterior, estadoNuevo, usuarioId, comentario]
      );
      connection.release();
    } catch (error) {
      console.error('Error al guardar historial:', error);
    }
  }
}
