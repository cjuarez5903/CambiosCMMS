import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pais, EstadoPais } from '../../entities/pais.entity';
import { CrearPaisDto } from './dto/crear-pais.dto';
import { ActualizarPaisDto } from './dto/actualizar-pais.dto';

@Injectable()
export class PaisesService {
  constructor(
    @InjectRepository(Pais)
    private paisRepository: Repository<Pais>,
  ) {}

  async findAll(filtros?: { estado?: EstadoPais }) {
    const { estado } = filtros || {};

    const query = this.paisRepository.createQueryBuilder('pais')
      .leftJoinAndSelect('pais.gerentePais', 'gerentePais');

    if (estado) {
      query.where('pais.estado = :estado', { estado });
    }

    query.orderBy('pais.nombre', 'ASC');

    return query.getMany();
  }

  async findOne(id: number) {
    const pais = await this.paisRepository.findOne({
      where: { id },
      relations: ['gerentePais'],
    });

    if (!pais) {
      throw new NotFoundException(`País con ID ${id} no encontrado`);
    }

    return pais;
  }

  async create(crearPaisDto: CrearPaisDto) {
    // Verificar si el código ya existe
    const paisExistente = await this.paisRepository.findOne({
      where: { codigo: crearPaisDto.codigo },
    });

    if (paisExistente) {
      throw new ConflictException('El código del país ya existe');
    }

    const pais = this.paisRepository.create(crearPaisDto);
    return this.paisRepository.save(pais);
  }

  async update(id: number, actualizarPaisDto: ActualizarPaisDto) {
    const pais = await this.findOne(id);

    // Si se está actualizando el código, verificar que no exista
    if (actualizarPaisDto.codigo && actualizarPaisDto.codigo !== pais.codigo) {
      const codigoExistente = await this.paisRepository.findOne({
        where: { codigo: actualizarPaisDto.codigo },
      });

      if (codigoExistente) {
        throw new ConflictException('El código del país ya existe');
      }
    }

    await this.paisRepository.update(id, actualizarPaisDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const pais = await this.findOne(id);
    await this.paisRepository.remove(pais);
    return { mensaje: 'País eliminado exitosamente' };
  }
}
