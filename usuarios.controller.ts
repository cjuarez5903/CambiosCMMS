import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, Optional, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EstadoUsuario } from '../../entities/usuario.entity';
import { Type } from 'class-transformer';

@ApiTags('Usuarios')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoUsuario })
  @ApiQuery({ name: 'buscar', required: false, type: String })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'porPagina', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll(
    @Query('estado') estado?: EstadoUsuario,
    @Query('buscar') buscar?: string,
    @Query('pagina') pagina?: string,
    @Query('porPagina') porPagina?: string,
  ) {
    const paginaNum = pagina ? parseInt(pagina, 10) : undefined;
    const porPaginaNum = porPagina ? parseInt(porPagina, 10) : undefined;
    return this.usuariosService.findAll({
      estado,
      buscar,
      pagina: paginaNum,
      porPagina: porPaginaNum
    });
  }

  @Get('por-rol')
  @ApiOperation({ summary: 'Obtener usuarios por nombre de rol' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios del rol especificado' })
  @ApiQuery({ name: 'rolNombre', required: true, description: 'Nombre del rol a buscar' })
  obtenerPorRol(@Query('rolNombre') rolNombre: string) {
    if (!rolNombre) {
      throw new BadRequestException('El nombre del rol es requerido');
    }
    return this.usuariosService.findByRoleName(rolNombre);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(@Body() crearUsuarioDto: CrearUsuarioDto) {
    return this.usuariosService.create(crearUsuarioDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() actualizarUsuarioDto: ActualizarUsuarioDto) {
    return this.usuariosService.update(id, actualizarUsuarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remove(id);
  }
}
