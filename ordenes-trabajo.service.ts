import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenTrabajo, EstadoOrdenTrabajo, PrioridadOrdenTrabajo, TipoOrdenTrabajo } from '../../entities/orden-trabajo.entity';
import { HistorialOrdenTrabajo } from '../../entities/historial-orden-trabajo.entity';
import { Sucursal } from '../../entities/sucursal.entity';
import { Pais } from '../../entities/pais.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Proveedor } from '../../entities/proveedor.entity';
import { CrearOrdenTrabajoDto } from './dto/crear-orden-trabajo.dto';
import { ActualizarOrdenTrabajoDto } from './dto/actualizar-orden-trabajo.dto';
import { IniciarOrdenTrabajoDto } from './dto/iniciar-orden-trabajo.dto';
import { AsignarProveedorDto } from './dto/asignar-proveedor.dto';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { IniciarOrdenDto } from './dto/iniciar-orden.dto';
import { CompletarOrdenDto } from './dto/completar-orden.dto';
import { CapexService } from '../capex/capex.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { pool } from '../it-tickets/it-tickets.service';

@Injectable()
export class OrdenesTrabajoService {
  constructor(
    @InjectRepository(OrdenTrabajo)
    private ordenTrabajoRepository: Repository<OrdenTrabajo>,
    @InjectRepository(HistorialOrdenTrabajo)
    private historialRepository: Repository<HistorialOrdenTrabajo>,
    @InjectRepository(Sucursal)
    private sucursalRepository: Repository<Sucursal>,
    @InjectRepository(Pais)
    private paisRepository: Repository<Pais>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Proveedor)
    private proveedorRepository: Repository<Proveedor>,
    private capexService: CapexService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async findAll(usuarioId: number, filtros?: {
    sucursalId?: number;
    estado?: EstadoOrdenTrabajo;
    prioridad?: PrioridadOrdenTrabajo;
    tipo?: TipoOrdenTrabajo;
    pagina?: number;
    porPagina?: number;
  }) {
    const datos = filtros || {};
    const pagina = datos.pagina || 1;
    const porPagina = datos.porPagina || 1000;

    // Obtener usuario con su rol, sucursal y sucursales asignadas
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
      relations: ['rol', 'sucursal', 'sucursalesAsignadas', 'sucursalesAsignadas.pais'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const query = this.ordenTrabajoRepository.createQueryBuilder('orden')
      .leftJoinAndSelect('orden.sucursal', 'sucursal')
      .leftJoinAndSelect('sucursal.pais', 'pais')
      .leftJoinAndSelect('orden.creadoPor', 'creadoPor')
      .leftJoinAndSelect('orden.solicitadoPor', 'solicitadoPor')
      .leftJoinAndSelect('orden.asignadoAUsuario', 'asignadoAUsuario')
      .leftJoinAndSelect('orden.asignadoAProveedor', 'asignadoAProveedor')
      .leftJoinAndSelect('orden.activo', 'activo');

    // Filtrar por rol
    // Administrador: ve todas las órdenes
    // Gerente de País: ve órdenes de todas las sucursales de los países asignados
    // Gerente de Sucursal: solo ve órdenes de su sucursal
    if (usuario.rol.nombre !== 'Administrador') {
      if (usuario.rol.nombre === 'Gerente de País') {
        // Gerente de País: filtrar por todas las sucursales de los países asignados
        // Obtener los IDs de países únicos de las sucursales asignadas
        if (usuario.sucursalesAsignadas && usuario.sucursalesAsignadas.length > 0) {
          const paisIds = [...new Set(
            usuario.sucursalesAsignadas
              .filter(s => s.pais && s.pais.id)
              .map(s => s.pais.id)
          )];

          if (paisIds.length > 0) {
            // Filtrar órdenes donde la sucursal pertenezca a alguno de los países asignados
            query.andWhere('sucursal.paisId IN (:...paisIds)', { paisIds });
          } else {
            // Si no tiene países asignados válidos, no ve ninguna orden
            query.andWhere('1 = 0');
          }
        } else {
          // Si no tiene sucursales asignadas, no ve ninguna orden
          query.andWhere('1 = 0');
        }
      } else if (usuario.sucursalId) {
        // Otros roles: solo ven órdenes de su sucursal específica
        query.andWhere('orden.sucursalId = :usuarioSucursalId', { usuarioSucursalId: usuario.sucursalId });
      } else {
        // Si no es admin y no tiene sucursal, no ve ninguna orden
        query.andWhere('1 = 0');
      }
    }

    if (datos.sucursalId) {
      query.andWhere('orden.sucursalId = :sucursalId', { sucursalId: datos.sucursalId });
    }

    if (datos.estado) {
      query.andWhere('orden.estado = :estado', { estado: datos.estado });
    }

    if (datos.prioridad) {
      query.andWhere('orden.prioridad = :prioridad', { prioridad: datos.prioridad });
    }

    if (datos.tipo) {
      query.andWhere('orden.tipo = :tipo', { tipo: datos.tipo });
    }

    query
      .skip((pagina - 1) * porPagina)
      .take(porPagina)
      .orderBy('orden.fechaReporte', 'DESC');

    const resultado = await query.getManyAndCount();
    const ordenes = resultado[0];
    const total = resultado[1];

    return {
      datos: ordenes,
      total,
      pagina,
      ultimaPagina: Math.ceil(total / porPagina),
      porPagina,
    };
  }

  async findOne(id: number) {
    const orden = await this.ordenTrabajoRepository.findOne({
      where: { id },
      relations: ['sucursal', 'sucursal.pais', 'creadoPor', 'solicitadoPor', 'asignadoAUsuario', 'asignadoAProveedor', 'activo'],
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo con ID ' + id + ' no encontrada');
    }

    return orden;
  }

  private async aplicarConversionMoneda(
    ordenData: any,
    sucursalId: number,
  ): Promise<any> {
    const sucursal = await this.sucursalRepository.findOne({
      where: { id: sucursalId },
      relations: ['pais'],
    });

    if (!sucursal || !sucursal.pais) {
      return ordenData;
    }

    const tasaCambio = Number(sucursal.pais.tasaCambioUsd);
    const esUSD = sucursal.pais.moneda === 'USD';

    // Si el país usa USD, no hay conversión
    if (esUSD) {
      if (ordenData.costoEstimado !== undefined) {
        ordenData.costoEstimadoLocal = ordenData.costoEstimado;
      }
      if (ordenData.costoReal !== undefined) {
        ordenData.costoRealLocal = ordenData.costoReal;
      }
      return ordenData;
    }

    // Conversión bidireccional
    // Si viene costoEstimado en USD, calcular local
    if (ordenData.costoEstimado !== undefined && ordenData.costoEstimadoLocal === undefined) {
      ordenData.costoEstimadoLocal = ordenData.costoEstimado * tasaCambio;
    }
    // Si viene costoEstimadoLocal, calcular USD
    else if (ordenData.costoEstimadoLocal !== undefined && ordenData.costoEstimado === undefined) {
      ordenData.costoEstimado = ordenData.costoEstimadoLocal / tasaCambio;
    }

    // Mismo para costo real
    if (ordenData.costoReal !== undefined && ordenData.costoRealLocal === undefined) {
      ordenData.costoRealLocal = ordenData.costoReal * tasaCambio;
    }
    else if (ordenData.costoRealLocal !== undefined && ordenData.costoReal === undefined) {
      ordenData.costoReal = ordenData.costoRealLocal / tasaCambio;
    }

    return ordenData;
  }

  async create(crearOrdenDto: CrearOrdenTrabajoDto, creadoPorId: number) {
    const año = new Date().getFullYear();

    // VALIDACIÓN PRESUPUESTARIA
    // Verificar saldo disponible antes de crear la OT
    const costoEstimado = crearOrdenDto.costoEstimadoUsd || 0;

    if (costoEstimado > 0) {
      const validacionPresupuesto = await this.capexService.verificarSaldoDisponible(
        crearOrdenDto.sucursalId,
        año,
        costoEstimado,
      );

      if (!validacionPresupuesto.tienePresupuesto) {
        throw new BadRequestException({
          mensaje: 'Presupuesto excedido',
          detalles: validacionPresupuesto.mensaje,
          saldoDisponible: validacionPresupuesto.saldoDisponible,
          costoEstimado: costoEstimado,
          excedente: costoEstimado - validacionPresupuesto.saldoDisponible,
        });
      }
    }

    // BUG 8 FIX: usar MAX del año actual en vez de count() para evitar
    // race conditions y números duplicados cuando se borran OTs
    const maxResult = await this.ordenTrabajoRepository.manager.query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(numero_ot, '-', -1) AS UNSIGNED)) AS maxSeq
       FROM ordenes_trabajo
       WHERE numero_ot LIKE ?`,
      [`OT-${año}-%`],
    );
    const maxSeq = (maxResult[0]?.maxSeq || 0) as number;
    const numeroOT = 'OT-' + año + '-' + String(maxSeq + 1).padStart(4, '0');

    const datosConvertidos = await this.aplicarConversionMoneda(
      { ...crearOrdenDto },
      crearOrdenDto.sucursalId,
    );

    const orden = this.ordenTrabajoRepository.create({
      ...datosConvertidos,
      numeroOT,
      creadoPorId,
      solicitadoPorId: creadoPorId, // Usuario solicitante es el mismo que crea la orden
      estado: EstadoOrdenTrabajo.PENDIENTE,
      presupuestoAprobado: false, // Inicia sin aprobar
    });

    const ordenGuardada = (await this.ordenTrabajoRepository.save(orden)) as unknown as OrdenTrabajo;

    // Notificar automáticamente al Gerente de País (fire-and-forget)
    this.notificarNuevaOrdenBackground(ordenGuardada.id);

    // Guardar historial inicial cuando se crea la orden
    await this.guardarHistorial(
      ordenGuardada.id,
      null, // No hay estado anterior
      EstadoOrdenTrabajo.PENDIENTE,
      creadoPorId,
      'Orden de trabajo creada',
      {
        titulo: ordenGuardada.titulo,
        categoria: ordenGuardada.categoria,
        categoriaSap: ordenGuardada.categoriaSap,
        prioridad: ordenGuardada.prioridad,
        tipo: ordenGuardada.tipo,
        costoEstimadoUsd: ordenGuardada.costoEstimadoUsd,
      },
    );

    return ordenGuardada;
  }

  async update(id: number, actualizarOrdenDto: ActualizarOrdenTrabajoDto) {
    const orden = await this.findOne(id);

    const datosConvertidos = await this.aplicarConversionMoneda(
      { ...actualizarOrdenDto },
      orden.sucursalId,
    );

    await this.ordenTrabajoRepository.update(id, datosConvertidos);
    return this.findOne(id);
  }

  async asignarUsuario(id: number, usuarioId: number) {
    const orden = await this.findOne(id);

    if (orden.estado === EstadoOrdenTrabajo.COMPLETADA || orden.estado === EstadoOrdenTrabajo.CANCELADA) {
      throw new BadRequestException('No se puede asignar una orden completada o cancelada');
    }

    await this.ordenTrabajoRepository.update(id, {
      asignadoAUsuarioId: usuarioId,
      asignadoAProveedorId: null,
      estado: EstadoOrdenTrabajo.ASIGNADA,
    });

    return this.findOne(id);
  }

  async asignarProveedor(id: number, asignarDto: AsignarProveedorDto) {
    const orden = await this.findOne(id);

    if (orden.estado === EstadoOrdenTrabajo.COMPLETADA || orden.estado === EstadoOrdenTrabajo.CANCELADA) {
      throw new BadRequestException('No se puede asignar una orden completada o cancelada');
    }

    // Aplicar conversión de moneda para los costos estimados
    const datosConvertidos = await this.aplicarConversionMoneda(
      {
        costoEstimado: asignarDto.costoEstimado,
        costoEstimadoLocal: asignarDto.costoEstimadoLocal,
      },
      orden.sucursalId,
    );

    await this.ordenTrabajoRepository.update(id, {
      asignadoAProveedorId: asignarDto.proveedorId,
      asignadoAUsuarioId: null,
      fechaProgramada: asignarDto.fechaProgramada,
      costoEstimado: datosConvertidos.costoEstimado,
      costoEstimadoLocal: datosConvertidos.costoEstimadoLocal,
      estado: EstadoOrdenTrabajo.ASIGNADA,
    });

    return this.findOne(id);
  }

  async iniciar(id: number, iniciarDto: IniciarOrdenTrabajoDto) {
    const orden = await this.findOne(id);

    if (orden.estado !== EstadoOrdenTrabajo.ASIGNADA) {
      throw new BadRequestException('Solo se pueden iniciar órdenes asignadas');
    }

    // Agregar observación adicional a la descripción si existe
    let nuevaDescripcion = orden.descripcion || '';
    if (iniciarDto.observacionAdicional) {
      nuevaDescripcion = nuevaDescripcion
        ? `${nuevaDescripcion}\n\n--- Observación al iniciar ---\n${iniciarDto.observacionAdicional}`
        : `--- Observación al iniciar ---\n${iniciarDto.observacionAdicional}`;
    }

    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.EN_PROGRESO,
      fechaIniciada: new Date(),
      descripcion: nuevaDescripcion,
    });

    return this.findOne(id);
  }

  async completar(id: number, completarDto: CompletarOrdenDto) {
    const orden = await this.findOne(id);

    if (orden.estado === EstadoOrdenTrabajo.COMPLETADA) {
      throw new BadRequestException('La orden ya está completada');
    }

    if (orden.estado === EstadoOrdenTrabajo.CANCELADA) {
      throw new BadRequestException('No se puede completar una orden cancelada');
    }

    // Aplicar conversión de moneda para los costos reales
    const datosConvertidos = await this.aplicarConversionMoneda(
      {
        costoReal: completarDto.costoReal,
        costoRealLocal: completarDto.costoRealLocal,
      },
      orden.sucursalId,
    );

    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.COMPLETADA,
      fechaCompletada: new Date(),
      notasResolucion: completarDto.notasResolucion,
      costoReal: datosConvertidos.costoReal,
      costoRealLocal: datosConvertidos.costoRealLocal,
      fotoDespues: completarDto.fotoDespues,
    });

    return this.findOne(id);
  }

  async cancelar(id: number, motivo?: string) {
    const orden = await this.findOne(id);

    if (orden.estado === EstadoOrdenTrabajo.COMPLETADA) {
      throw new BadRequestException('No se puede cancelar una orden completada');
    }

    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.CANCELADA,
      notasResolucion: motivo,
    });

    return this.findOne(id);
  }

  async getEstadisticas(filtros?: { sucursalId?: number; fechaInicio?: string; fechaFin?: string }) {
    const query = this.ordenTrabajoRepository.createQueryBuilder('orden');

    if (filtros && filtros.sucursalId) {
      query.andWhere('orden.sucursalId = :sucursalId', { sucursalId: filtros.sucursalId });
    }

    if (filtros && filtros.fechaInicio) {
      query.andWhere('orden.fechaReporte >= :fechaInicio', { fechaInicio: filtros.fechaInicio });
    }

    if (filtros && filtros.fechaFin) {
      query.andWhere('orden.fechaReporte <= :fechaFin', { fechaFin: filtros.fechaFin });
    }

    const resultado = await query.getManyAndCount();
    const ordenes = resultado[0];
    const total = resultado[1];

    const porEstado: Record<string, number> = {};
    const porPrioridad: Record<string, number> = {};
    const porTipo: Record<string, number> = {};

    ordenes.forEach(orden => {
      porEstado[orden.estado] = (porEstado[orden.estado] || 0) + 1;
      porPrioridad[orden.prioridad] = (porPrioridad[orden.prioridad] || 0) + 1;
      porTipo[orden.tipo] = (porTipo[orden.tipo] || 0) + 1;
    });

    return {
      total,
      porEstado,
      porPrioridad,
      porTipo,
    };
  }

  // Métodos auxiliares para validación de permisos y historial

  private async validarPermiso(usuarioId: number, accion: 'asignar' | 'iniciar' | 'completar'): Promise<Usuario> {
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .leftJoinAndSelect('usuario.sucursal', 'sucursal')
      .where('usuario.id = :usuarioId', { usuarioId })
      .getOne();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Solo administradores pueden asignar, iniciar y completar órdenes
    if (usuario.rol.nombre !== 'Administrador') {
      throw new ForbiddenException(`Solo los administradores pueden ${accion} órdenes de trabajo`);
    }

    return usuario;
  }

  private async guardarHistorial(
    ordenId: number,
    estadoAnterior: EstadoOrdenTrabajo | null,
    estadoNuevo: EstadoOrdenTrabajo,
    usuarioId: number,
    comentario?: string,
    datosAdicionales?: any,
  ): Promise<void> {
    const historial = this.historialRepository.create({
      ordenTrabajoId: ordenId,
      estadoAnterior,
      estadoNuevo,
      usuarioId,
      comentario,
      datosAdicionales,
    });

    await this.historialRepository.save(historial);

    // Enviar notificaciones por email si hay cambio de estado
    // Se ejecuta en background (fire-and-forget) para no bloquear la respuesta
    if (estadoAnterior !== estadoNuevo) {
      // Ejecutar en background sin esperar (Promise sin await)
      this.enviarNotificacionEmailBackground(ordenId, estadoAnterior, estadoNuevo);
    }
  }

  /**
   * Envía notificación de email en background sin bloquear el flujo principal
   * Fire-and-forget pattern - los errores se registran pero no afectan la operación
   */
  private enviarNotificacionEmailBackground(
    ordenId: number,
    estadoAnterior: string | null,
    estadoNuevo: string,
  ): void {
    // Timeout absoluto para todo el proceso
    const TIMEOUT_TOTAL_MS = 10000; // 10 segundos máximo

    // Ejecutar de forma asíncrona sin bloquear
    setImmediate(() => {
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️  Timeout al enviar email para orden ${ordenId} - proceso cancelado`);
      }, TIMEOUT_TOTAL_MS);

      (async () => {
        try {
          const orden = await this.ordenTrabajoRepository.findOne({
            where: { id: ordenId },
            relations: ['solicitadoPor', 'sucursal'],
          });

          if (orden) {
            const emailSolicitante = orden.solicitadoPor?.email;
            const sucursalNombre = orden.sucursal?.nombre || 'N/A';

            await this.emailService.enviarNotificacionCambioEstado(
              orden.numeroOT,
              estadoAnterior || 'NUEVO',
              estadoNuevo,
              emailSolicitante,
              sucursalNombre,
              orden.titulo,
            );
            
            console.log(`✅ Email enviado exitosamente para OT ${orden.numeroOT}`);
          }
        } catch (error) {
          console.error('❌ Error al enviar notificación por email (no bloqueante):', error.message || error);
          // No lanzamos el error - fire-and-forget pattern
        } finally {
          clearTimeout(timeoutId);
        }
      })();
    });
  }

  /**
   * Notifica automáticamente al Gerente de País cuando se crea una nueva OT.
   * Fire-and-forget - no bloquea la respuesta.
   */
  private notificarNuevaOrdenBackground(ordenId: number): void {
    setImmediate(() => {
      (async () => {
        try {
          const orden = await this.ordenTrabajoRepository.findOne({
            where: { id: ordenId },
            relations: ['sucursal', 'sucursal.pais', 'sucursal.pais.gerentePais', 'creadoPor'],
          });

          if (!orden) return;

          const destinatarios: string[] = [];

          // 1. Francisco — siempre recibe notificación de cualquier OT nueva
          const franciscoEmail = this.configService.get<string>('FRANCISCO_EMAIL');
          if (franciscoEmail) {
            franciscoEmail.split(/[,;]/).map(e => e.trim()).filter(e => e).forEach(e => destinatarios.push(e));
          }

          // 2. Gerente de País — según el país de la sucursal
          const gerentePaisEmail = orden.sucursal?.pais?.gerentePais?.email;
          if (gerentePaisEmail && !destinatarios.includes(gerentePaisEmail)) {
            destinatarios.push(gerentePaisEmail);
          }

          if (destinatarios.length === 0) return;

          const creadoPorNombre = orden.creadoPor
            ? `${orden.creadoPor.nombre} ${orden.creadoPor.apellido}`
            : 'Usuario';

          await this.emailService.enviarNuevaOrdenTrabajo(
            orden.numeroOT,
            orden.titulo,
            orden.descripcion,
            orden.sucursal?.nombre || 'N/A',
            orden.sucursal?.pais?.nombre || 'N/A',
            destinatarios,
            creadoPorNombre,
          );

          console.log(`✅ Notificación nueva OT ${orden.numeroOT} enviada a: ${destinatarios.join(', ')}`);
        } catch (error) {
          console.error('❌ Error notificando nueva OT:', error.message || error);
        }
      })();
    });
  }

  async getHistorial(ordenId: number) {
    const historial = await this.historialRepository.find({
      where: { ordenTrabajoId: ordenId },
      relations: ['usuario'],
      order: { creadoEn: 'ASC' },
    });

    return historial;
  }

  // Nuevos métodos con validación de roles e historial

  async asignarOrden(id: number, asignarDto: AsignarOrdenDto, usuarioId: number) {
    // Validar que el usuario tenga permisos
    const usuario = await this.validarPermiso(usuarioId, 'asignar');

    const orden = await this.findOne(id);

    // Normalizar comparación de estado (case-insensitive para compatibilidad)
    const estadoNormalizado = orden.estado?.toString().toUpperCase();
    if (estadoNormalizado !== EstadoOrdenTrabajo.PENDIENTE) {
      throw new BadRequestException(`Solo se pueden asignar órdenes pendientes. Estado actual: ${orden.estado}`);
    }

    // Aplicar conversión de moneda para los costos estimados
    const datosConvertidos = await this.aplicarConversionMoneda(
      {
        costoEstimado: asignarDto.costoEstimado,
        costoEstimadoLocal: asignarDto.costoEstimadoLocal,
      },
      orden.sucursalId,
    );

    const estadoAnterior = orden.estado;

    // Convertir fecha programada a mediodía para evitar problemas de zona horaria
    const fechaProgramadaDate = new Date(asignarDto.fechaProgramada);
    fechaProgramadaDate.setHours(12, 0, 0, 0);

    // Preparar datos de actualización
    const datosActualizacion: any = {
      asignadoAUsuarioId: asignarDto.asignadoAUsuarioId,
      asignadoAProveedorId: asignarDto.asignadoAProveedorId,
      fechaProgramada: fechaProgramadaDate,
      costoEstimado: datosConvertidos.costoEstimado,
      costoEstimadoLocal: datosConvertidos.costoEstimadoLocal,
      estado: EstadoOrdenTrabajo.ASIGNADA,
      fechaAsignada: new Date(),
      usuarioAsignoId: usuarioId,
    };

    // Solo los administradores pueden asignar la categoría SAP
    if (asignarDto.categoriaSap !== undefined) {
      if (usuario.rol.nombre !== 'Administrador') {
        throw new ForbiddenException('Solo los administradores pueden asignar la categoría SAP');
      }
      datosActualizacion.categoriaSap = asignarDto.categoriaSap;
    }

    // Actualizar la orden
    await this.ordenTrabajoRepository.update(id, datosActualizacion);

    // Obtener información adicional para el historial
    const ordenActualizada = await this.findOne(id);
    let asignadoA = 'No asignado';
    if (ordenActualizada.asignadoAProveedor) {
      asignadoA = `Proveedor: ${ordenActualizada.asignadoAProveedor.nombreEmpresa}`;
    } else if (ordenActualizada.asignadoAUsuario) {
      asignadoA = `Usuario: ${ordenActualizada.asignadoAUsuario.nombre} ${ordenActualizada.asignadoAUsuario.apellido}`;
    }

    // Guardar historial
    await this.guardarHistorial(
      id,
      estadoAnterior,
      EstadoOrdenTrabajo.ASIGNADA,
      usuarioId,
      asignarDto.comentario || 'Orden asignada',
      {
        asignadoA,
        fechaProgramada: asignarDto.fechaProgramada,
        costoEstimado: datosConvertidos.costoEstimado,
      },
    );

    return ordenActualizada;
  }

  async iniciarOrden(id: number, iniciarDto: IniciarOrdenDto, usuarioId: number) {
    // Validar que el usuario tenga permisos
    const usuario = await this.validarPermiso(usuarioId, 'iniciar');

    const orden = await this.findOne(id);

    // Normalizar comparación de estado (case-insensitive para compatibilidad)
    const estadoNormalizado = orden.estado?.toString().toUpperCase();
    if (estadoNormalizado !== EstadoOrdenTrabajo.ASIGNADA) {
      throw new BadRequestException(`Solo se pueden iniciar órdenes asignadas. Estado actual: ${orden.estado}`);
    }

    const estadoAnterior = orden.estado;

    // Agregar observación adicional a la descripción si existe
    let nuevaDescripcion = orden.descripcion || '';
    if (iniciarDto.observacion) {
      nuevaDescripcion = nuevaDescripcion
        ? `${nuevaDescripcion}\n\n--- Observación al iniciar ---\n${iniciarDto.observacion}`
        : `--- Observación al iniciar ---\n${iniciarDto.observacion}`;
    }

    // Actualizar la orden
    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.EN_PROGRESO,
      fechaIniciada: new Date(),
      usuarioInicioId: usuarioId,
      descripcion: nuevaDescripcion,
    });

    // Guardar historial
    await this.guardarHistorial(
      id,
      estadoAnterior,
      EstadoOrdenTrabajo.EN_PROGRESO,
      usuarioId,
      iniciarDto.comentario || 'Orden iniciada',
      {
        observacion: iniciarDto.observacion,
      },
    );

    return this.findOne(id);
  }

  async completarOrden(id: number, completarDto: CompletarOrdenDto, usuarioId: number) {
    // Validar que el usuario tenga permisos
    const usuario = await this.validarPermiso(usuarioId, 'completar');

    const orden = await this.findOne(id);

    // Normalizar comparación de estado (case-insensitive para compatibilidad)
    const estadoNormalizado = orden.estado?.toString().toUpperCase();

    if (estadoNormalizado === EstadoOrdenTrabajo.COMPLETADA) {
      throw new BadRequestException('La orden ya está completada');
    }

    if (estadoNormalizado === EstadoOrdenTrabajo.CANCELADA) {
      throw new BadRequestException('No se puede completar una orden cancelada');
    }

    if (estadoNormalizado !== EstadoOrdenTrabajo.EN_PROGRESO) {
      throw new BadRequestException(`Solo se pueden completar órdenes en progreso. Estado actual: ${orden.estado}`);
    }

    const estadoAnterior = orden.estado;

    // Aplicar conversión de moneda para los costos reales
    const datosConvertidos = await this.aplicarConversionMoneda(
      {
        costoReal: completarDto.costoReal,
        costoRealLocal: completarDto.costoRealLocal,
      },
      orden.sucursalId,
    );

    // Actualizar la orden
    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.COMPLETADA,
      fechaCompletada: new Date(),
      usuarioCompletoId: usuarioId,
      notasResolucion: completarDto.notasResolucion,
      costoReal: datosConvertidos.costoReal,
      costoRealLocal: datosConvertidos.costoRealLocal,
      fotoDespues: completarDto.fotoDespues,
      calificacion: completarDto.calificacion,
    });

    // Guardar historial
    await this.guardarHistorial(
      id,
      estadoAnterior,
      EstadoOrdenTrabajo.COMPLETADA,
      usuarioId,
      completarDto.comentario || 'Orden completada',
      {
        notasResolucion: completarDto.notasResolucion,
        costoReal: datosConvertidos.costoReal,
        calificacion: completarDto.calificacion,
      },
    );

    // Actualizar proveedor (total trabajos y calificación promedio)
    if (orden.asignadoAProveedorId) {
      await this.actualizarEstadisticasProveedor(orden.asignadoAProveedorId, completarDto.calificacion);
    }

    // Registrar gasto en CAPEX si hay costo real
    if (datosConvertidos.costoReal && datosConvertidos.costoReal > 0) {
      const año = new Date(orden.fechaReporte).getFullYear();
      try {
        await this.capexService.registrarGastoOrdenTrabajo(
          orden.sucursalId,
          año,
          datosConvertidos.costoReal,
          datosConvertidos.costoRealLocal || datosConvertidos.costoReal,
          id,
          usuarioId,
          `Gasto OT ${orden.numeroOT}: ${orden.titulo}`,
        );
      } catch (error) {
        // Si no existe presupuesto CAPEX, solo registrar advertencia pero no fallar la operación
        console.warn(`No se pudo registrar gasto en CAPEX para OT ${orden.numeroOT}:`, error.message);
      }
    }

    return this.findOne(id);
  }

  /**
   * Actualiza las estadísticas del proveedor:
   * - Incrementa totalTrabajos en 1
   * - Recalcula calificacion basado en todas las órdenes completadas
   */
  private async actualizarEstadisticasProveedor(proveedorId: number, nuevaCalificacion?: number): Promise<void> {
    const proveedor = await this.proveedorRepository.findOne({
      where: { id: proveedorId },
    });

    if (!proveedor) {
      console.warn(`Proveedor con ID ${proveedorId} no encontrado`);
      return;
    }

    // Incrementar total de trabajos
    const nuevoTotalTrabajos = (proveedor.totalTrabajos || 0) + 1;

    // Calcular nuevo promedio de calificación
    let nuevaCalificacionPromedio = proveedor.calificacion || 0;

    if (nuevaCalificacion && nuevaCalificacion >= 1 && nuevaCalificacion <= 5) {
      // Obtener todas las órdenes completadas de este proveedor con calificación
      const ordenesCompletadas = await this.ordenTrabajoRepository.find({
        where: {
          asignadoAProveedorId: proveedorId,
          estado: EstadoOrdenTrabajo.COMPLETADA,
        },
        select: ['calificacion'],
      });

      // Filtrar solo las que tienen calificación y agregar la nueva
      const calificaciones = [
        ...ordenesCompletadas
          .map(o => o.calificacion)
          .filter((c): c is number => c !== null && c !== undefined && c >= 1 && c <= 5),
        nuevaCalificacion,
      ];

      if (calificaciones.length > 0) {
        const suma = calificaciones.reduce((acc, cal) => acc + cal, 0);
        nuevaCalificacionPromedio = Number((suma / calificaciones.length).toFixed(2));
      }
    }

    // Actualizar proveedor
    await this.proveedorRepository.update(proveedorId, {
      totalTrabajos: nuevoTotalTrabajos,
      calificacion: nuevaCalificacionPromedio,
    });
  }

  /**
   * Cancelar una orden de trabajo
   * Solo se permite si el estado es PENDIENTE
   * Requiere observación obligatoria
   */
  async cancelarOrden(
    id: number,
    observacion: string,
    usuarioId: number,
  ): Promise<OrdenTrabajo> {
    const orden = await this.ordenTrabajoRepository.findOne({
      where: { id },
      relations: ['sucursal'],
    });

    if (!orden) {
      throw new NotFoundException(`Orden de trabajo con ID ${id} no encontrada`);
    }

    // Normalizar el estado actual
    const estadoNormalizado = orden.estado?.toUpperCase() as EstadoOrdenTrabajo;

    // Validar que no esté cancelada
    if (estadoNormalizado === EstadoOrdenTrabajo.CANCELADA) {
      throw new BadRequestException('La orden ya está cancelada');
    }

    // Solo se puede cancelar si está en estado PENDIENTE
    if (estadoNormalizado !== EstadoOrdenTrabajo.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden cancelar órdenes en estado PENDIENTE. Estado actual: ${orden.estado}`
      );
    }

    const estadoAnterior = orden.estado;

    // Actualizar la orden a estado cancelado
    await this.ordenTrabajoRepository.update(id, {
      estado: EstadoOrdenTrabajo.CANCELADA,
    });

    // Guardar en historial con la observación
    await this.guardarHistorial(
      id,
      estadoAnterior,
      EstadoOrdenTrabajo.CANCELADA,
      usuarioId,
      observacion,
      {
        motivoCancelacion: observacion,
      },
    );

    // Retornar la orden actualizada
    return this.findOne(id);
  }

  async obtenerComentarios(ordenId: number): Promise<any[]> {
    const [rows] = await pool.query(
      `SELECT otc.id, otc.comentario, otc.fecha_creacion,
              CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre
       FROM orden_trabajo_comentarios otc
       JOIN usuarios u ON u.id = otc.usuario_id
       WHERE otc.orden_id = ?
       ORDER BY otc.fecha_creacion ASC`,
      [ordenId],
    ) as [any[], any];
    return rows;
  }

  async agregarComentario(ordenId: number, comentario: string, user: any): Promise<any> {
    const usuarioId = user.sub;

    const [result] = await pool.query(
      `INSERT INTO orden_trabajo_comentarios (orden_id, comentario, usuario_id) VALUES (?, ?, ?)`,
      [ordenId, comentario, usuarioId],
    ) as [any, any];

    const [infoRows] = await pool.query(
      `SELECT ot.numero_ot,
              ot.estado,
              sol.email AS solicitante_email,
              asig.email AS asignado_email,
              CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre
       FROM ordenes_trabajo ot
       LEFT JOIN usuarios sol ON sol.id = ot.solicitado_por
       LEFT JOIN usuarios asig ON asig.id = ot.asignado_a_usuario_id
       JOIN usuarios u ON u.id = ?
       WHERE ot.id = ?`,
      [usuarioId, ordenId],
    ) as [any[], any];

    const info = infoRows[0];
    const autorEmail = user.email;

    // Registrar en historial (sin cambio de estado)
    if (info?.estado) {
      const entradaHistorial = this.historialRepository.create({
        ordenTrabajoId: ordenId,
        estadoAnterior: info.estado as EstadoOrdenTrabajo,
        estadoNuevo: info.estado as EstadoOrdenTrabajo,
        usuarioId,
        comentario,
        datosAdicionales: { tipo: 'comentario', autor: info.autor_nombre },
      });
      await this.historialRepository.save(entradaHistorial);
    }

    setImmediate(async () => {
      if (!info) return;
      const correos = [info.solicitante_email, info.asignado_email]
        .filter(e => e && e !== autorEmail);
      if (correos.length === 0) return;
      try {
        await this.emailService.enviarComentarioOrdenTrabajo({
          numeroOT: info.numero_ot,
          comentario,
          autor: info.autor_nombre,
          correos,
        });
      } catch (e) {
        console.error('Error enviando email de comentario OT:', e?.message);
      }
    });

    return {
      id: result.insertId,
      comentario,
      usuario_nombre: info?.autor_nombre || '',
      fecha_creacion: new Date(),
    };
  }
}
