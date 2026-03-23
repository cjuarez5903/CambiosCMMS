import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LecturaPlanta } from '../../entities/lectura-planta.entity';
import { ConfiguracionPlanta } from '../../entities/configuracion-planta.entity';
import { Sucursal } from '../../entities/sucursal.entity';
import { Usuario } from '../../entities/usuario.entity';
import { Pais } from '../../entities/pais.entity';
import { EmailService } from '../email/email.service';
import { CrearLecturaDto } from './dto/crear-lectura.dto';
import { ConfigurarPlantaDto } from './dto/configurar-planta.dto';

@Injectable()
export class PlantaTratamientoService {
  constructor(
    @InjectRepository(LecturaPlanta)
    private lecturaRepository: Repository<LecturaPlanta>,
    @InjectRepository(ConfiguracionPlanta)
    private configuracionRepository: Repository<ConfiguracionPlanta>,
    @InjectRepository(Sucursal)
    private sucursalRepository: Repository<Sucursal>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Pais)
    private paisRepository: Repository<Pais>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ─── VALIDACIÓN DE ACCESO ────────────────────────────────────────────────────

  /**
   * Valida que el usuario tenga acceso al módulo de Planta de Tratamiento.
   * - Administrador: acceso total sin restricción de país.
   * - Administrador de Sucursal: solo si su sucursal pertenece a Guatemala.
   * Retorna el usuario con sus relaciones cargadas.
   */
  private async validarAccesoGuatemala(usuarioId: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
      relations: ['rol', 'sucursal', 'sucursal.pais'],
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const esAdministrador = usuario.rol?.nombre === 'Administrador';
    if (esAdministrador) return usuario;

    // Administrador de Sucursal → validar que pertenezca a Guatemala
    const paisNombre = usuario.sucursal?.pais?.nombre;
    if (paisNombre !== 'Guatemala') {
      throw new ForbiddenException(
        'Este módulo solo está disponible para sucursales de Guatemala.',
      );
    }

    return usuario;
  }

  // ─── LECTURAS ───────────────────────────────────────────────────────────────

  async crearLectura(dto: CrearLecturaDto, usuarioId: number): Promise<LecturaPlanta> {
    // Validar acceso y obtener usuario
    const usuario = await this.validarAccesoGuatemala(usuarioId);

    if (!usuario.sucursalId) {
      throw new BadRequestException(
        'El usuario no tiene una sucursal asignada. Contacte al administrador.',
      );
    }

    const sucursalId = usuario.sucursalId;

    // Obtener la última lectura registrada para esta sucursal
    const ultimaLectura = await this.lecturaRepository.findOne({
      where: { sucursalId },
      order: { horaRegistro: 'DESC' },
    });

    const lecturaAnterior = ultimaLectura ? Number(ultimaLectura.lecturaActualM3) : null;

    // Validar que la nueva lectura no sea menor que la anterior
    if (lecturaAnterior !== null && dto.lecturaActualM3 < lecturaAnterior) {
      throw new BadRequestException(
        `La lectura actual (${dto.lecturaActualM3} m³) no puede ser menor que la última lectura registrada (${lecturaAnterior} m³).`,
      );
    }

    // Calcular consumo diario
    const consumoDiario =
      lecturaAnterior !== null ? dto.lecturaActualM3 - lecturaAnterior : null;

    // Fecha y hora automáticas del servidor
    const ahora = new Date();
    const fechaRegistro = ahora.toISOString().split('T')[0]; // YYYY-MM-DD

    // Verificar si supera el caudal de diseño
    let alertaGenerada = false;
    const configuracion = await this.configuracionRepository.findOne({
      where: { sucursalId },
    });

    if (consumoDiario !== null && configuracion && Number(configuracion.caudalDisenoM3dia) > 0) {
      if (consumoDiario > Number(configuracion.caudalDisenoM3dia)) {
        alertaGenerada = true;
      }
    }

    // Guardar la lectura
    const lectura = this.lecturaRepository.create({
      sucursalId,
      fechaRegistro,
      horaRegistro: ahora,
      lecturaActualM3: dto.lecturaActualM3,
      lecturaAnteriorM3: lecturaAnterior,
      consumoDiarioM3: consumoDiario,
      alertaGenerada,
      creadoPorId: usuarioId,
    });

    const lecturaGuardada = await this.lecturaRepository.save(lectura);

    // Enviar alerta de sobreconsumo en background si aplica
    if (alertaGenerada) {
      this.enviarAlertaBackground(
        lecturaGuardada,
        usuario.sucursal,
        Number(configuracion.caudalDisenoM3dia),
      );
    }

    return this.findOneLectura(lecturaGuardada.id);
  }

  async findAllLecturas(usuarioId: number, filtros?: {
    sucursalId?: number;
    fechaInicio?: string;
    fechaFin?: string;
    pagina?: number;
    porPagina?: number;
  }) {
    const usuario = await this.validarAccesoGuatemala(usuarioId);

    // Administrador de Sucursal solo ve su propia sucursal
    if (usuario.rol?.nombre !== 'Administrador' && usuario.sucursalId) {
      filtros = { ...filtros, sucursalId: usuario.sucursalId };
    }
    const pagina = filtros?.pagina || 1;
    const porPagina = filtros?.porPagina || 50;

    const query = this.lecturaRepository
      .createQueryBuilder('lectura')
      .leftJoinAndSelect('lectura.sucursal', 'sucursal')
      .leftJoinAndSelect('sucursal.pais', 'pais')
      .leftJoinAndSelect('lectura.creadoPor', 'creadoPor');

    if (filtros?.sucursalId) {
      query.andWhere('lectura.sucursalId = :sucursalId', {
        sucursalId: filtros.sucursalId,
      });
    }

    if (filtros?.fechaInicio) {
      query.andWhere('lectura.fechaRegistro >= :fechaInicio', {
        fechaInicio: filtros.fechaInicio,
      });
    }

    if (filtros?.fechaFin) {
      query.andWhere('lectura.fechaRegistro <= :fechaFin', {
        fechaFin: filtros.fechaFin,
      });
    }

    query
      .orderBy('lectura.horaRegistro', 'DESC')
      .skip((pagina - 1) * porPagina)
      .take(porPagina);

    const [datos, total] = await query.getManyAndCount();

    // Enriquecer con indicador visual
    const configuraciones = await this.configuracionRepository.find();
    const configMap = new Map(configuraciones.map(c => [c.sucursalId, Number(c.caudalDisenoM3dia)]));

    const datosConIndicador = datos.map(lectura => {
      const caudal = configMap.get(lectura.sucursalId) ?? 0;
      const consumo = lectura.consumoDiarioM3 !== null ? Number(lectura.consumoDiarioM3) : null;
      let indicador: 'verde' | 'amarillo' | 'rojo' | 'sin_datos' = 'sin_datos';

      if (consumo !== null && caudal > 0) {
        const pct = consumo / caudal;
        if (pct <= 0.8) indicador = 'verde';
        else if (pct <= 1.0) indicador = 'amarillo';
        else indicador = 'rojo';
      }

      return { ...lectura, indicador, caudalDisenoM3dia: caudal };
    });

    return {
      datos: datosConIndicador,
      total,
      pagina,
      ultimaPagina: Math.ceil(total / porPagina),
      porPagina,
    };
  }

  async findOneLectura(id: number): Promise<LecturaPlanta> {
    const lectura = await this.lecturaRepository.findOne({
      where: { id },
      relations: ['sucursal', 'sucursal.pais', 'creadoPor'],
    });

    if (!lectura) {
      throw new NotFoundException(`Lectura con ID ${id} no encontrada`);
    }

    return lectura;
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────────────────

  async getDashboard(usuarioId: number, sucursalId?: number) {
    const usuario = await this.validarAccesoGuatemala(usuarioId);

    // Administrador de Sucursal solo ve su propia sucursal
    if (usuario.rol?.nombre !== 'Administrador' && usuario.sucursalId) {
      sucursalId = usuario.sucursalId;
    }
    const query = this.lecturaRepository
      .createQueryBuilder('lectura')
      .leftJoinAndSelect('lectura.sucursal', 'sucursal')
      .orderBy('lectura.horaRegistro', 'DESC');

    if (sucursalId) {
      query.where('lectura.sucursalId = :sucursalId', { sucursalId });
    }

    // Últimas 30 lecturas para gráfica
    query.take(30);

    const lecturas = await query.getMany();

    const configuraciones = await this.configuracionRepository.find(
      sucursalId ? { where: { sucursalId } } : {},
    );
    const configMap = new Map(
      configuraciones.map(c => [c.sucursalId, Number(c.caudalDisenoM3dia)]),
    );

    const conIndicador = lecturas.map(l => {
      const caudal = configMap.get(l.sucursalId) ?? 0;
      const consumo = l.consumoDiarioM3 !== null ? Number(l.consumoDiarioM3) : null;
      let indicador: 'verde' | 'amarillo' | 'rojo' | 'sin_datos' = 'sin_datos';

      if (consumo !== null && caudal > 0) {
        const pct = consumo / caudal;
        if (pct <= 0.8) indicador = 'verde';
        else if (pct <= 1.0) indicador = 'amarillo';
        else indicador = 'rojo';
      }

      return {
        id: l.id,
        sucursal: l.sucursal?.nombre,
        sucursalId: l.sucursalId,
        fechaRegistro: l.fechaRegistro,
        horaRegistro: l.horaRegistro,
        lecturaAnteriorM3: l.lecturaAnteriorM3 !== null ? Number(l.lecturaAnteriorM3) : null,
        lecturaActualM3: Number(l.lecturaActualM3),
        consumoDiarioM3: consumo,
        caudalDisenoM3dia: caudal,
        alertaGenerada: l.alertaGenerada,
        indicador,
      };
    });

    // Estadísticas
    const totalLecturas = await this.lecturaRepository.count(
      sucursalId ? { where: { sucursalId } } : {},
    );
    const totalAlertas = await this.lecturaRepository.count(
      sucursalId
        ? { where: { sucursalId, alertaGenerada: true } }
        : { where: { alertaGenerada: true } },
    );

    return {
      resumen: {
        totalLecturas,
        totalAlertas,
      },
      lecturas: conIndicador,
      // Datos para gráfica (orden cronológico ascendente)
      grafica: [...conIndicador].reverse().map(l => ({
        fecha: l.fechaRegistro,
        consumo: l.consumoDiarioM3,
        caudal: l.caudalDisenoM3dia,
        indicador: l.indicador,
      })),
    };
  }

  // ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────

  async getConfiguracion(usuarioId: number, sucursalId: number): Promise<ConfiguracionPlanta> {
    await this.validarAccesoGuatemala(usuarioId);
    const config = await this.configuracionRepository.findOne({
      where: { sucursalId },
      relations: ['sucursal'],
    });

    if (!config) {
      throw new NotFoundException(
        `No existe configuración de planta para la sucursal ID ${sucursalId}`,
      );
    }

    return config;
  }

  async guardarConfiguracion(usuarioId: number, dto: ConfigurarPlantaDto): Promise<ConfiguracionPlanta> {
    await this.validarAccesoGuatemala(usuarioId);
    let config = await this.configuracionRepository.findOne({
      where: { sucursalId: dto.sucursalId },
    });

    if (config) {
      await this.configuracionRepository.update(config.id, {
        caudalDisenoM3dia: dto.caudalDisenoM3dia,
        notas: dto.notas,
      });
      return this.getConfiguracion(usuarioId, dto.sucursalId);
    }

    const nueva = this.configuracionRepository.create({
      sucursalId: dto.sucursalId,
      caudalDisenoM3dia: dto.caudalDisenoM3dia,
      notas: dto.notas,
    });

    return this.configuracionRepository.save(nueva);
  }

  async findAllConfiguraciones(usuarioId: number) {
    await this.validarAccesoGuatemala(usuarioId);
    return this.configuracionRepository.find({
      relations: ['sucursal'],
      order: { sucursalId: 'ASC' },
    });
  }

  // ─── ALERTA BACKGROUND ──────────────────────────────────────────────────────

  private enviarAlertaBackground(
    lectura: LecturaPlanta,
    sucursal: Sucursal,
    caudalDiseno: number,
  ): void {
    setImmediate(() => {
      (async () => {
        try {
          const sucursalCompleta = await this.sucursalRepository.findOne({
            where: { id: sucursal.id },
          });

          const destinatarios: string[] = [];

          // 1. Gerente de País de Guatemala (siempre, sin importar el país de la sucursal)
          const guatemala = await this.paisRepository.findOne({
            where: { nombre: 'Guatemala' },
            relations: ['gerentePais'],
          });
          const gerenteGuatemalaEmail = guatemala?.gerentePais?.email;
          if (gerenteGuatemalaEmail) destinatarios.push(gerenteGuatemalaEmail);

          // 2. Emails adicionales configurados en .env (Juanjo, yo, etc.)
          const alertaEmails = this.configService.get<string>('PLANTA_ALERTA_EMAILS');
          if (alertaEmails) {
            const extras = alertaEmails
              .split(/[,;]/)
              .map(e => e.trim())
              .filter(e => e.length > 0);
            destinatarios.push(...extras);
          }

          if (destinatarios.length === 0) {
            console.warn('⚠️  Alerta de planta generada pero no hay destinatarios configurados');
            return;
          }

          await this.emailService.enviarAlertaConsumoPlanta({
            sucursalNombre: sucursalCompleta?.nombre || 'N/A',
            fechaRegistro: lectura.fechaRegistro,
            lecturaAnteriorM3: lectura.lecturaAnteriorM3 !== null ? Number(lectura.lecturaAnteriorM3) : 0,
            lecturaActualM3: Number(lectura.lecturaActualM3),
            consumoDiarioM3: lectura.consumoDiarioM3 !== null ? Number(lectura.consumoDiarioM3) : 0,
            caudalDisenoM3dia: caudalDiseno,
            destinatarios,
          });

          console.log(`🚨 Alerta de sobreconsumo enviada para ${sucursalCompleta?.nombre}`);
        } catch (error) {
          console.error('❌ Error enviando alerta de planta:', error.message || error);
        }
      })();
    });
  }
}
