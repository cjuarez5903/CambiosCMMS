import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ITTicket } from '../../entities/it-ticket.entity';
import { ITTicketComentario } from './entities/it-ticket-comentario.entity';
import { ITTicketHistorial } from './entities/it-ticket-historial.entity';
import { CreateITTicketDto } from './dto/create-it-ticket.dto';
import { UpdateITTicketDto } from './dto/update-it-ticket.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { EmailService } from '../email/email.service';
import * as mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const configService = {
  get: (key: string) => process.env[key],
};

// Crear pool de conexiones MySQL
const pool = mysql.createPool({
  host: configService.get('DB_HOST'),
  port: parseInt(configService.get('DB_PORT')) || 3306,
  user: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

@Injectable()
export class ITTicketsService {
  constructor(
    @InjectRepository(ITTicket)
    private readonly itTicketRepository: Repository<ITTicket>,
    @InjectRepository(ITTicketComentario)
    private readonly comentarioRepository: Repository<ITTicketComentario>,
    @InjectRepository(ITTicketHistorial)
    private readonly historialRepository: Repository<ITTicketHistorial>,
    private readonly emailService: EmailService,
  ) {}

  private async getAdminITEmail(): Promise<string | null> {
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT u.email FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'Administrador IT' LIMIT 1`,
      );
      return rows?.[0]?.email || null;
    } catch {
      return null;
    }
  }

  private async resolveUsuarioId(user?: any): Promise<number | null> {
    if (!user) return null;

    const directId = user?.id ?? user?.userId ?? user?.sub;
    if (typeof directId === 'number' && Number.isFinite(directId)) return directId;
    if (typeof directId === 'string' && directId.trim() !== '' && !Number.isNaN(Number(directId))) {
      return Number(directId);
    }

    const email = user?.email;
    if (typeof email !== 'string' || email.trim() === '') return null;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const [rows] = await pool.query<any[]>(
        'SELECT id FROM usuarios WHERE LOWER(email) = ? LIMIT 1',
        [normalizedEmail],
      );
      const id = rows?.[0]?.id;
      if (typeof id === 'number' && Number.isFinite(id)) return id;
      return null;
    } catch (e) {
      console.error('Error resolviendo usuarioId por email:', e);
      return null;
    }
  }

  async obtenerConteoComentarios(ids: string | undefined, user?: any): Promise<Record<string, number>> {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      if (!userEmail) return {};

      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;

      const parsedIds = String(ids || '')
        .split(',')
        .map(x => Number(String(x).trim()))
        .filter(n => Number.isFinite(n) && n > 0);

      if (parsedIds.length === 0) return {};

      const placeholders = parsedIds.map(() => '?').join(',');
      const params: any[] = [...parsedIds];

      let sql = `
        SELECT c.ticket_id AS ticketId, COUNT(*) AS total
        FROM it_ticket_comentarios c
        INNER JOIN it_tickets t ON t.id = c.ticket_id
        WHERE c.ticket_id IN (${placeholders})
      `;

      if (!isAdmin && !isIT) {
        sql += ` AND (LOWER(t.solicitante) = ? OR LOWER(t.asignado_a) = ?) `;
        params.push(userEmail, userEmail);
      }

      sql += ` GROUP BY c.ticket_id `;

      const [rows] = await pool.query<any[]>(sql, params);
      const result: Record<string, number> = {};
      for (const r of rows || []) {
        result[String(r.ticketId)] = Number(r.total) || 0;
      }
      // Asegurar que tickets sin comentarios regresen 0
      for (const id of parsedIds) {
        const key = String(id);
        if (result[key] === undefined) result[key] = 0;
      }
      return result;
    } catch (error) {
      console.error('Error al obtener conteo de comentarios:', error);
      return {};
    }
  }

  async obtenerConteoHistorial(ids: string | undefined, user?: any): Promise<Record<string, number>> {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      if (!userEmail) return {};

      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;

      const parsedIds = String(ids || '')
        .split(',')
        .map(x => Number(String(x).trim()))
        .filter(n => Number.isFinite(n) && n > 0);

      if (parsedIds.length === 0) return {};

      const placeholders = parsedIds.map(() => '?').join(',');
      const params: any[] = [...parsedIds];

      let sql = `
        SELECT h.ticket_id AS ticketId, COUNT(*) AS total
        FROM it_ticket_historial h
        INNER JOIN it_tickets t ON t.id = h.ticket_id
        WHERE h.ticket_id IN (${placeholders})
      `;

      if (!isAdmin && !isIT) {
        sql += ` AND (LOWER(t.solicitante) = ? OR LOWER(t.asignado_a) = ?) `;
        params.push(userEmail, userEmail);
      }

      sql += ` GROUP BY h.ticket_id `;

      const [rows] = await pool.query<any[]>(sql, params);
      const result: Record<string, number> = {};
      for (const r of rows || []) {
        result[String(r.ticketId)] = Number(r.total) || 0;
      }
      // Asegurar que tickets sin historial regresen 0
      for (const id of parsedIds) {
        const key = String(id);
        if (result[key] === undefined) result[key] = 0;
      }
      return result;
    } catch (error) {
      console.error('Error al obtener conteo de historial:', error);
      return {};
    }
  }

  async create(createITTicketDto: CreateITTicketDto, user?: any): Promise<ITTicket> {
    // If user is not IT and asignado_a is set, remove it
    if (createITTicketDto.asignado_a && !this.isITUser(user)) {
      createITTicketDto.asignado_a = null;
    }

    const ticket = this.itTicketRepository.create(createITTicketDto);
    const savedTicket = await this.itTicketRepository.save(ticket);

    // Registrar en historial
    await this.guardarHistorial(savedTicket.id, null, savedTicket.estado, await this.resolveUsuarioId(user), 'Ticket creado');

    // Notificar: solicitante (confirmación) + Administrador IT (nuevo ticket)
    this.getAdminITEmail().then(adminEmail => {
      const destinatarios = [createITTicketDto.solicitante, adminEmail].filter(Boolean);
      this.emailService.enviarNuevoTicketIT({
        ticketId: savedTicket.id,
        titulo: savedTicket.titulo,
        descripcion: savedTicket.descripcion,
        prioridad: savedTicket.prioridad,
        categoria: savedTicket.categoria,
        solicitante: savedTicket.solicitante,
        destinatarios,
      }).catch(() => {});
    }).catch(() => {});

    return savedTicket;
  }

  private isITUser(user: any): boolean {
    console.log('🔍 isITUser() called with:', {
      hasUser: !!user,
      hasRol: !!user?.rol,
      hasRolPermisos: !!user?.rol?.permisos,
      permisos: user?.rol?.permisos,
      email: user?.email
    });
    
    if (!user || !user.rol || !user.rol.permisos) {
      console.log('❌ isITUser: false - No hay usuario o permisos');
      return false;
    }
    
    const permisos = user.rol.permisos;
    
    // IT users have 'it_soluciones' in their routes
    const hasITSolutionsAccess = permisos.rutas && 
                               Array.isArray(permisos.rutas) && 
                               permisos.rutas.includes('it_soluciones');
    
    // IT users should NOT have 'todo: true' (that's admin)
    const isNotAdmin = permisos.todo !== true;
    
    const result = hasITSolutionsAccess && isNotAdmin;
    
    console.log('🔍 isITUser() result:', {
      hasITSolutionsAccess,
      isNotAdmin,
      finalResult: result,
      permisos: permisos
    });
    
    return result;
  }

  private isAdminUser(user: any): boolean {
    if (!user) return false;
    
    console.log('🔍 isAdminUser check:', {
      hasUser: !!user,
      hasPermisos: !!user.permisos,
      permisosTodo: user.permisos?.todo,
      hasRol: !!user.rol,
      hasRolPermisos: !!user.rol?.permisos,
      rolPermisosTodo: user.rol?.permisos?.todo
    });
    
    // Check direct permissions first
    if (user.permisos && user.permisos.todo === true) {
      console.log('✅ Admin detected via direct permissions');
      return true;
    }
    
    // Check role permissions
    if (user.rol && user.rol.permisos && user.rol.permisos.todo === true) {
      console.log('✅ Admin detected via role permissions');
      return true;
    }
    
    console.log('❌ Not admin detected');
    return false;
  }

  private async getRolFromDB(userId: number): Promise<{ nombre: string; permisos: any } | null> {
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT r.nombre, r.permisos
         FROM usuarios u
         INNER JOIN roles r ON r.id = u.rol_id
         WHERE u.id = ? LIMIT 1`,
        [userId],
      );
      return rows?.[0] || null;
    } catch {
      return null;
    }
  }

  async findAll(
    paginationDto: PaginationDto,
    busqueda?: string,
    asignado_a?: string,
    user?: any,
    estado?: string,
    prioridad?: string,
    categoria?: string,
    estado_excluir?: string,
    estado_incluir?: string,
    sin_asignar?: boolean,
    con_asignar?: boolean
  ): Promise<any> {
    try {
      const pagina = paginationDto?.pagina || 1;
      const porPagina = paginationDto?.porPagina || 10;
      const skip = (pagina - 1) * porPagina;

      // Obtener rol real desde BD (el JWT solo trae sub/email/rolId)
      const userId = user?.sub ?? user?.id ?? user?.userId;
      const rol = userId ? await this.getRolFromDB(Number(userId)) : null;
      const permisos = rol?.permisos || {};

      let whereClause = '';
      let params: any[] = [];

      // Solo Administrador IT ve todos los tickets
      const isAdminIT = rol?.nombre === 'Administrador IT';

      // Técnico IT ve solo los asignados a él
      const isIT = rol?.nombre === 'Técnico IT';

      if (isAdminIT) {
        // Administrador IT — ve todos los tickets
      } else if (isIT) {
        // Técnico IT — solo ve los tickets asignados a él
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
      
      if (asignado_a) {
        filtros.push('asignado_a = ?');
        params.push(asignado_a);
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
        SELECT id, titulo, descripcion, estado, prioridad, categoria, solicitante, asignado_a, fecha_creacion, fecha_actualizacion
        FROM it_tickets${whereClause}
        ORDER BY fecha_creacion DESC
        LIMIT ? OFFSET ?
      `;
      
      // Agregar parámetros de paginación
      params.push(porPagina, skip);

      // Ejecutar consulta usando el pool de MySQL directo
      const connection = await pool.getConnection();
      const [tickets] = await connection.query(sqlQuery, params);

      // Conteo total con las mismas condiciones de acceso
      let countParams: any[] = [];
      let countConditions = '';

      if (isIT) {
        countConditions = ' WHERE asignado_a = ?';
        countParams.push(user?.email);
      } else if (!isAdminIT) {
        countConditions = ' WHERE solicitante = ?';
        countParams.push(user?.email);
      }

      const countQuery = `SELECT COUNT(*) as total FROM it_tickets${countConditions}`;
      
      const [countResult] = await connection.query(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      connection.release();

      return {
        datos: tickets || [],
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina)
      };
      
    } catch (error) {
      console.error('❌ Error in findAll:', error);
      throw error;
    }
  }

  async findAllForDashboard(paginationDto: PaginationDto, busqueda?: string, user?: any) {
    const { pagina, porPagina } = paginationDto;
    const skip = (pagina - 1) * porPagina;

    let whereCondition: any = {};
    
    // Add search conditions
    if (busqueda) {
      whereCondition = [
        { titulo: Like(`%${busqueda}%`) },
        { descripcion: Like(`%${busqueda}%`) },
        { solicitante: Like(`%${busqueda}%`) }
      ];
    }

    // For dashboard, admin sees ALL tickets without role filtering
    const [tickets, total] = await this.itTicketRepository.findAndCount({
      where: whereCondition,
      skip,
      take: porPagina,
      order: { fecha_creacion: 'DESC' }
    });

    return {
      datos: tickets,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina)
    };
  }

  async findOne(id: number): Promise<ITTicket> {
    return await this.itTicketRepository.findOne({ where: { id } });
  }

  async update(id: number, updateITTicketDto: UpdateITTicketDto): Promise<ITTicket> {
    await this.itTicketRepository.update(id, updateITTicketDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.itTicketRepository.delete(id);
  }

  async obtenerEstadisticas(params?: { asignado_a?: string }, user?: any): Promise<any> {
    // Filtrar tickets según parámetros y rol del usuario
    let whereCondition: any = {};
    if (params?.asignado_a && !this.isITUser(user)) {
      whereCondition.asignado_a = params.asignado_a;
    }
    // Si es IT o admin, no filtrar por asignado_a (mostrar todas las estadísticas)
    
    const tickets = await this.itTicketRepository.find({ where: whereCondition });
    
    const abiertos = tickets.filter(t => t.estado === 'abierto').length;
    const enProgreso = tickets.filter(t => t.estado === 'en_progreso').length;
    const resueltos = tickets.filter(t => t.estado === 'resuelto').length;
    const cerrados = tickets.filter(t => t.estado === 'cerrado').length;
    const criticos = tickets.filter(t => t.prioridad === 'critica').length;
    
    const hoy = new Date();
    const resueltosHoy = tickets.filter(t => 
      t.estado === 'resuelto' && 
      t.fecha_actualizacion && 
      new Date(t.fecha_actualizacion).toDateString() === hoy.toDateString()
    ).length;
    
    const ticketsAsignados = tickets.filter(t => t.asignado_a).length;
    
    const porCategoria = {
      soporte_tecnico: tickets.filter(t => t.categoria === 'soporte_tecnico').length,
      hardware: tickets.filter(t => t.categoria === 'hardware').length,
      software: tickets.filter(t => t.categoria === 'software').length,
      red: tickets.filter(t => t.categoria === 'red').length,
      acceso: tickets.filter(t => t.categoria === 'acceso').length,
      sap: tickets.filter(t => t.categoria === 'sap').length,
      sitelink: tickets.filter(t => t.categoria === 'sitelink').length,
    };
    
    const porPrioridad = {
      critica: tickets.filter(t => t.prioridad === 'critica').length,
      alta: tickets.filter(t => t.prioridad === 'alta').length,
      media: tickets.filter(t => t.prioridad === 'media').length,
      baja: tickets.filter(t => t.prioridad === 'baja').length,
    };

    return {
      abiertos,
      enProgreso,
      resueltos,
      cerrados,
      criticos,
      resueltosHoy,
      ticketsAsignados,
      porCategoria,
      porPrioridad,
    };
  }

  async asignarTicket(id: number, asignado_a: string, user?: any): Promise<ITTicket> {
    const usuarioId = await this.resolveUsuarioId(user);
    const ticket = await this.findOne(id);
    const asignadoAnterior = ticket?.asignado_a || '';
    const asignadoNuevo = asignado_a || '';

    const updateData: any = { asignado_a: asignadoNuevo };
    if (usuarioId) {
      updateData.actualizado_por = usuarioId;
    }

    if (asignadoAnterior !== asignadoNuevo && usuarioId) {
      await this.guardarHistorial(
        id,
        ticket?.estado,
        ticket?.estado,
        usuarioId,
        `Asignación cambiada de "${asignadoAnterior || 'sin asignar'}" a "${asignadoNuevo || 'sin asignar'}"`,
      );
    }

    await this.itTicketRepository.update(id, updateData);
    const ticketActualizado = await this.findOne(id);

    // Notificar asignación: técnico (tiene ticket nuevo) + solicitante (está siendo atendido)
    if (asignadoAnterior !== asignadoNuevo && asignadoNuevo) {
      const destinatarios = [asignadoNuevo, ticket?.solicitante].filter(Boolean);
      this.emailService.enviarTicketAsignadoIT({
        ticketId: id,
        titulo: ticket?.titulo || '',
        solicitante: ticket?.solicitante || '',
        tecnicoEmail: asignadoNuevo,
        destinatarios,
      }).catch(() => {});
    }

    return ticketActualizado;
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
    
    // Si el estado cambió, guardar en historial
    if (estadoAnterior !== estado && usuarioId) {
      await this.guardarHistorial(
        id,
        estadoAnterior,
        estado,
        usuarioId,
        `Cambio de estado de "${estadoAnterior}" a "${estado}"`
      );
    }
    
    await this.itTicketRepository.update(id, updateData);
    const ticketActualizado = await this.findOne(id);

    // Notificar cambio de estado: solicitante + técnico asignado (si existe)
    if (estadoAnterior !== estado) {
      const destinatarios = [ticket?.solicitante, ticket?.asignado_a].filter(Boolean);
      this.emailService.enviarCambioEstadoTicketIT({
        ticketId: id,
        titulo: ticket?.titulo || '',
        estadoAnterior,
        estadoNuevo: estado,
        destinatarios,
      }).catch(() => {});
    }

    return ticketActualizado;
  }

  async agregarComentario(id: number, comentario: string, user?: any): Promise<ITTicketComentario> {
    try {
      const usuarioId = await this.resolveUsuarioId(user);
      if (!usuarioId) {
        console.error('No se pudo resolver usuarioId para comentario:', {
          ticketId: id,
          userKeys: user ? Object.keys(user) : null,
          email: user?.email,
          id: user?.id,
          sub: user?.sub,
          userId: user?.userId,
        });
        throw new Error('Usuario inválido para comentario');
      }

      const nuevoComentario = this.comentarioRepository.create({
        ticket_id: id,
        comentario,
        usuario_id: usuarioId,
      });

      const savedComentario = await this.comentarioRepository.save(nuevoComentario);

      // Notificar al OTRO lado: si el solicitante comentó → avisar al técnico/Admin IT
      // Si el técnico/admin comentó → avisar al solicitante
      this.findOne(id).then(async (ticket) => {
        if (!ticket) return;
        const autorEmail = (user?.email || '').toLowerCase().trim();
        const esSolicitante = autorEmail === (ticket.solicitante || '').toLowerCase();
        let destinatario: string | null = null;
        if (esSolicitante) {
          destinatario = ticket.asignado_a || await this.getAdminITEmail();
        } else {
          destinatario = ticket.solicitante || null;
        }
        if (destinatario && destinatario.toLowerCase() !== autorEmail) {
          this.emailService.enviarComentarioTicketIT({
            ticketId: id,
            titulo: ticket.titulo,
            comentario,
            autorEmail: user?.email || '',
            destinatario,
          }).catch(() => {});
        }
      }).catch(() => {});

      return savedComentario;
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      throw new Error('No se pudo agregar el comentario');
    }
  }

  async obtenerNotificacionesComentarios(since: string | undefined, user?: any): Promise<any[]> {
    try {
      const userEmail = (user?.email || '').toLowerCase().trim();
      if (!userEmail) return [];

      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;

      let sinceDate = since ? new Date(since) : null;
      if (!sinceDate || Number.isNaN(sinceDate.getTime())) {
        // fallback: últimos 30 minutos
        sinceDate = new Date(Date.now() - 30 * 60 * 1000);
      }

      // Admin e IT ven comentarios recientes de todos los tickets
      // Otros usuarios solo ven tickets donde son solicitante o asignado
      const baseQuery = `
        SELECT
          c.ticket_id AS ticketId,
          c.id AS comentarioId,
          c.comentario AS comentario,
          u.email AS authorEmail,
          c.fecha_creacion AS createdAt
        FROM it_ticket_comentarios c
        INNER JOIN it_tickets t ON t.id = c.ticket_id
        LEFT JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.fecha_creacion > ?
      `;

      const params: any[] = [sinceDate];

      let querySql = baseQuery;
      if (!isAdmin && !isIT) {
        querySql += ` AND (LOWER(t.solicitante) = ? OR LOWER(t.asignado_a) = ?) `;
        params.push(userEmail, userEmail);
      }

      querySql += ` ORDER BY c.fecha_creacion DESC LIMIT 50 `;

      const [rows] = await pool.query<any[]>(querySql, params);
      return (rows || []).map(r => ({
        ticketId: Number(r.ticketId),
        comentarioId: Number(r.comentarioId),
        comentario: r.comentario,
        authorEmail: r.authorEmail,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error al obtener notificaciones de comentarios:', error);
      return [];
    }
  }

  async obtenerComentarios(id: number): Promise<ITTicketComentario[]> {
    try {
      return await this.comentarioRepository.find({
        where: { ticket_id: id },
        relations: ['usuario'],
        order: { fecha_creacion: 'ASC' },
      });
    } catch (error) {
      console.error('Error al obtener comentarios:', error);
      return [];
    }
  }

  async obtenerComentariosConPermiso(id: number, userEmail: string, user?: any): Promise<ITTicketComentario[]> {
    try {
      // Primero obtener el ticket para verificar permisos
      const ticket = await this.findOne(id);
      
      // Verificar si el usuario tiene permiso para ver comentarios
      const isAdmin = user?.permisos?.todo === true || user?.rol?.permisos?.todo === true;
      const isIT = user?.rol?.permisos?.rutas?.includes('it_soluciones') || false;
      const isSolicitante = ticket.solicitante === userEmail;
      const isAsignado = ticket.asignado_a === userEmail;
      
      // Solo permitir ver comentarios si es admin, IT, solicitante o asignado
      if (!isAdmin && !isIT && !isSolicitante && !isAsignado) {
        console.log('🔒 Usuario no autorizado para ver comentarios del ticket:', {
          userEmail,
          solicitante: ticket.solicitante,
          asignado_a: ticket.asignado_a,
          isAdmin,
          isIT,
          isSolicitante,
          isAsignado
        });
        return [];
      }
      
      console.log('✅ Usuario autorizado para ver comentarios:', userEmail);
      
      return await this.comentarioRepository.find({
        where: { ticket_id: id },
        relations: ['usuario'],
        order: { fecha_creacion: 'ASC' },
      });
    } catch (error) {
      console.error('Error al obtener comentarios con permiso:', error);
      return [];
    }
  }

  async obtenerHistorial(id: number): Promise<ITTicketHistorial[]> {
    try {
      return await this.historialRepository.find({
        where: { ticket_id: id },
        relations: ['usuario'],
        order: { fecha_cambio: 'DESC' },
      });
    } catch (error) {
      console.error('Error al obtener historial:', error);
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
      const historial = this.historialRepository.create({
        ticket_id: ticketId,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo,
        usuario_id: usuarioId,
        comentario,
      });
      
      await this.historialRepository.save(historial);
    } catch (error) {
      console.error('Error al guardar historial:', error);
    }
  }
}
