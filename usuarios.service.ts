import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario, EstadoUsuario } from '../../entities/usuario.entity';
import { Sucursal } from '../../entities/sucursal.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Sucursal)
    private sucursalRepository: Repository<Sucursal>,
  ) {}

  async findAll(filtros?: { estado?: EstadoUsuario; buscar?: string; pagina?: number; porPagina?: number }) {
    const { estado, buscar, pagina = 1, porPagina = 10 } = filtros || {};

    const query = this.usuarioRepository.createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.rol', 'rol')
      .leftJoinAndSelect('usuario.sucursal', 'sucursal')
      .leftJoinAndSelect('sucursal.pais', 'pais')
      .leftJoinAndSelect('usuario.sucursalesAsignadas', 'sucursalesAsignadas')
      .leftJoinAndSelect('sucursalesAsignadas.pais', 'paisAsignado');

    if (estado) {
      query.andWhere('usuario.estado = :estado', { estado });
    }

    if (buscar) {
      query.andWhere(
        '(usuario.nombre LIKE :buscar OR usuario.apellido LIKE :buscar OR usuario.email LIKE :buscar)',
        { buscar: `%${buscar}%` },
      );
    }

    query
      .skip((pagina - 1) * porPagina)
      .take(porPagina)
      .orderBy('usuario.creadoEn', 'DESC');

    const [usuarios, total] = await query.getManyAndCount();

    // Remover password hash de la respuesta
    const usuariosSinPassword = usuarios.map(({ passwordHash, ...usuario }) => usuario);

    return {
      datos: usuariosSinPassword,
      total,
      pagina,
      ultimaPagina: Math.ceil(total / porPagina),
      porPagina,
    };
  }

  async findOne(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['rol', 'sucursal', 'sucursal.pais', 'sucursalesAsignadas', 'sucursalesAsignadas.pais'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { passwordHash, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  async create(crearUsuarioDto: CrearUsuarioDto) {
    // Verificar si el email ya existe
    const usuarioExistente = await this.usuarioRepository.findOne({
      where: { email: crearUsuarioDto.email },
    });

    if (usuarioExistente) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(crearUsuarioDto.password, salt);

    const { password, sucursalesAsignadasIds, ...datosUsuario } = crearUsuarioDto;

    const usuario = this.usuarioRepository.create({
      ...datosUsuario,
      passwordHash,
    });

    // Si hay sucursales asignadas, cargarlas
    if (sucursalesAsignadasIds && sucursalesAsignadasIds.length > 0) {
      const sucursales = await this.sucursalRepository.find({
        where: { id: In(sucursalesAsignadasIds) },
      });
      usuario.sucursalesAsignadas = sucursales;
    }

    const usuarioGuardado = await this.usuarioRepository.save(usuario);
    const { passwordHash: _, ...usuarioSinPassword } = usuarioGuardado;

    return usuarioSinPassword;
  }

  async update(id: number, actualizarUsuarioDto: ActualizarUsuarioDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['sucursalesAsignadas'],
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si se está actualizando el email, verificar que no exista
    if (actualizarUsuarioDto.email && actualizarUsuarioDto.email !== usuario.email) {
      const emailExistente = await this.usuarioRepository.findOne({
        where: { email: actualizarUsuarioDto.email },
      });

      if (emailExistente) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    const { sucursalesAsignadasIds, password, ...datosActualizar } = actualizarUsuarioDto as any;

    // Si se incluye contraseña, hashearla
    if (password) {
      const salt = await bcrypt.genSalt(10);
      datosActualizar.passwordHash = await bcrypt.hash(password, salt);
    }

    // Actualizar datos básicos
    await this.usuarioRepository.update(id, datosActualizar);

    // Si hay sucursales asignadas, actualizarlas
    if (sucursalesAsignadasIds !== undefined) {
      if (sucursalesAsignadasIds && sucursalesAsignadasIds.length > 0) {
        const sucursales = await this.sucursalRepository.find({
          where: { id: In(sucursalesAsignadasIds) },
        });
        usuario.sucursalesAsignadas = sucursales;
      } else {
        usuario.sucursalesAsignadas = [];
      }
      await this.usuarioRepository.save(usuario);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario as any);
    return { mensaje: 'Usuario eliminado exitosamente' };
  }

  async findByRoleName(rolNombre: string) {
    if (!rolNombre) {
      throw new BadRequestException('El nombre del rol es requerido');
    }
    
    try {
      return await this.usuarioRepository.find({
        where: {
          rol: { nombre: rolNombre },
          estado: EstadoUsuario.ACTIVO
        },
        select: ['id', 'nombre', 'apellido', 'email'],
        relations: ['rol'],
        order: { nombre: 'ASC' }
      });
    } catch (error) {
      console.error('Error en findByRoleName:', error);
      throw new BadRequestException('Error al buscar usuarios por rol');
    }
  }

  async cambiarPassword(id: number, nuevaPassword: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(nuevaPassword, salt);

    await this.usuarioRepository.update(id, { passwordHash });
    return { mensaje: 'Contraseña actualizada exitosamente' };
  }
}
