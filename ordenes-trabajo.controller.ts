import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { CrearOrdenTrabajoDto } from './dto/crear-orden-trabajo.dto';
import { ActualizarOrdenTrabajoDto } from './dto/actualizar-orden-trabajo.dto';
import { IniciarOrdenTrabajoDto } from './dto/iniciar-orden-trabajo.dto';
import { AsignarProveedorDto } from './dto/asignar-proveedor.dto';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { IniciarOrdenDto } from './dto/iniciar-orden.dto';
import { CompletarOrdenDto } from './dto/completar-orden.dto';
import { CancelarOrdenDto } from './dto/cancelar-orden.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EstadoOrdenTrabajo, PrioridadOrdenTrabajo, TipoOrdenTrabajo } from '../../entities/orden-trabajo.entity';

@ApiTags('Órdenes de Trabajo')
@Controller('ordenes-trabajo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdenesTrabajoController {
  constructor(private readonly ordenesTrabajoService: OrdenesTrabajoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de trabajo' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoOrdenTrabajo })
  @ApiQuery({ name: 'prioridad', required: false, enum: PrioridadOrdenTrabajo })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoOrdenTrabajo })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'porPagina', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de órdenes de trabajo' })
  findAll(
    @Request() req,
    @Query('sucursalId') sucursalId?: number,
    @Query('estado') estado?: EstadoOrdenTrabajo,
    @Query('prioridad') prioridad?: PrioridadOrdenTrabajo,
    @Query('tipo') tipo?: TipoOrdenTrabajo,
    @Query('pagina') pagina?: number,
    @Query('porPagina') porPagina?: number,
  ) {
    return this.ordenesTrabajoService.findAll(
      req.user.sub,
      {
        sucursalId: sucursalId ? +sucursalId : undefined,
        estado,
        prioridad,
        tipo,
        pagina: pagina ? +pagina : undefined,
        porPagina: porPagina ? +porPagina : undefined,
      }
    );
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de órdenes de trabajo' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String })
  @ApiQuery({ name: 'fechaFin', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  getEstadisticas(
    @Query('sucursalId') sucursalId?: number,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.ordenesTrabajoService.getEstadisticas({ sucursalId: sucursalId ? +sucursalId : undefined, fechaInicio, fechaFin });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden de trabajo por ID' })
  @ApiResponse({ status: 200, description: 'Orden de trabajo encontrada' })
  @ApiResponse({ status: 404, description: 'Orden de trabajo no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesTrabajoService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva orden de trabajo' })
  @ApiResponse({ status: 201, description: 'Orden de trabajo creada' })
  create(@Body() crearOrdenDto: CrearOrdenTrabajoDto, @Request() req) {
    return this.ordenesTrabajoService.create(crearOrdenDto, req.user.sub);
  }

  // Endpoint deshabilitado: No se permite editar órdenes de trabajo
  // Solo se pueden crear, asignar, iniciar, completar o cancelar
  // @Patch(':id')
  // @ApiOperation({ summary: 'Actualizar una orden de trabajo' })
  // @ApiResponse({ status: 200, description: 'Orden de trabajo actualizada' })
  // @ApiResponse({ status: 404, description: 'Orden de trabajo no encontrada' })
  // update(@Param('id', ParseIntPipe) id: number, @Body() actualizarOrdenDto: ActualizarOrdenTrabajoDto) {
  //   return this.ordenesTrabajoService.update(id, actualizarOrdenDto);
  // }

  @Patch(':id/asignar-usuario')
  @ApiOperation({ summary: 'Asignar orden a un usuario' })
  @ApiResponse({ status: 200, description: 'Orden asignada a usuario' })
  asignarUsuario(@Param('id', ParseIntPipe) id: number, @Body('usuarioId') usuarioId: number) {
    return this.ordenesTrabajoService.asignarUsuario(id, usuarioId);
  }

  @Patch(':id/asignar-proveedor')
  @ApiOperation({ summary: 'Asignar orden a un proveedor con fecha programada y costo estimado' })
  @ApiResponse({ status: 200, description: 'Orden asignada a proveedor' })
  @ApiResponse({ status: 400, description: 'Datos de asignación inválidos' })
  asignarProveedor(@Param('id', ParseIntPipe) id: number, @Body() asignarDto: AsignarProveedorDto) {
    return this.ordenesTrabajoService.asignarProveedor(id, asignarDto);
  }

  @Patch(':id/iniciar')
  @ApiOperation({ summary: 'Iniciar una orden de trabajo con observación adicional opcional' })
  @ApiResponse({ status: 200, description: 'Orden iniciada' })
  @ApiResponse({ status: 400, description: 'Solo se pueden iniciar órdenes asignadas' })
  iniciar(@Param('id', ParseIntPipe) id: number, @Body() iniciarDto: IniciarOrdenTrabajoDto) {
    return this.ordenesTrabajoService.iniciar(id, iniciarDto);
  }

  @Patch(':id/completar')
  @ApiOperation({ summary: 'Completar una orden de trabajo con notas de resolución, costo real y foto después' })
  @ApiResponse({ status: 200, description: 'Orden completada' })
  @ApiResponse({ status: 400, description: 'No se puede completar una orden cancelada' })
  completar(
    @Param('id', ParseIntPipe) id: number,
    @Body() completarDto: CompletarOrdenDto,
  ) {
    return this.ordenesTrabajoService.completar(id, completarDto);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar una orden de trabajo (solo estado PENDIENTE, requiere observación)' })
  @ApiResponse({ status: 200, description: 'Orden cancelada con historial registrado' })
  @ApiResponse({ status: 400, description: 'Solo se pueden cancelar órdenes en estado PENDIENTE' })
  @ApiResponse({ status: 403, description: 'Solo Administrador o Administrador de Sucursal pueden cancelar' })
  cancelarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelarDto: CancelarOrdenDto,
    @Request() req,
  ) {
    return this.ordenesTrabajoService.cancelarOrden(id, cancelarDto.observacion, req.user.sub);
  }

  // Nuevos endpoints con validación de roles e historial

  @Post(':id/asignar')
  @ApiOperation({ summary: 'Asignar orden (solo Administrador) - Crea historial' })
  @ApiResponse({ status: 200, description: 'Orden asignada con historial registrado' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden asignar órdenes' })
  @ApiResponse({ status: 400, description: 'Solo se pueden asignar órdenes pendientes' })
  asignarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() asignarDto: AsignarOrdenDto,
    @Request() req,
  ) {
    return this.ordenesTrabajoService.asignarOrden(id, asignarDto, req.user.sub);
  }

  @Post(':id/iniciar-trabajo')
  @ApiOperation({ summary: 'Iniciar orden (solo Administrador) - Crea historial' })
  @ApiResponse({ status: 200, description: 'Orden iniciada con historial registrado' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden iniciar órdenes' })
  @ApiResponse({ status: 400, description: 'Solo se pueden iniciar órdenes asignadas' })
  iniciarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() iniciarDto: IniciarOrdenDto,
    @Request() req,
  ) {
    return this.ordenesTrabajoService.iniciarOrden(id, iniciarDto, req.user.sub);
  }

  @Post(':id/completar-trabajo')
  @ApiOperation({ summary: 'Completar orden (solo Administrador) - Crea historial' })
  @ApiResponse({ status: 200, description: 'Orden completada con historial registrado' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden completar órdenes' })
  @ApiResponse({ status: 400, description: 'Solo se pueden completar órdenes en progreso' })
  completarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() completarDto: CompletarOrdenDto,
    @Request() req,
  ) {
    return this.ordenesTrabajoService.completarOrden(id, completarDto, req.user.sub);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Obtener historial de cambios de una orden de trabajo' })
  @ApiResponse({ status: 200, description: 'Historial obtenido' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  getHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesTrabajoService.getHistorial(id);
  }

  @Get(':id/comentarios')
  @ApiOperation({ summary: 'Obtener comentarios de una orden de trabajo' })
  @ApiResponse({ status: 200, description: 'Comentarios obtenidos' })
  obtenerComentarios(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesTrabajoService.obtenerComentarios(id);
  }

  @Post(':id/comentarios')
  @ApiOperation({ summary: 'Agregar comentario a una orden de trabajo' })
  @ApiResponse({ status: 201, description: 'Comentario agregado' })
  agregarComentario(
    @Param('id', ParseIntPipe) id: number,
    @Body('comentario') comentario: string,
    @Request() req,
  ) {
    return this.ordenesTrabajoService.agregarComentario(id, comentario, req.user);
  }
}
