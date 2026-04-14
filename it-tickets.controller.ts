import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ITTicketsService } from './it-tickets.service';
import { CreateITTicketDto } from './dto/create-it-ticket.dto';
import { UpdateITTicketDto } from './dto/update-it-ticket.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard as PermisosGuard } from '../../common/guards/permisos.guard';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { RequierePermisos } from '../../common/decorators/permisos.decorator';
// BUG 7 FIX: eliminado import directo de pool — la lógica fue movida al service

@ApiTags('IT Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('it-tickets')
export class ITTicketsController {
  constructor(private readonly itTicketsService: ITTicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo ticket de IT' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Ticket creado exitosamente' })
  create(@Body() createITTicketDto: CreateITTicketDto, @Request() req) {
    return this.itTicketsService.create(createITTicketDto, req.user);
  }

  // ─── RUTAS ESTÁTICAS — deben ir ANTES que las rutas con :id ─────────────────

  @Get()
  @UseGuards(PermisosGuard)
  @RequierePermisos('it_soluciones', 'todo')
  @ApiOperation({ summary: 'IT Solutions: Listar tickets de IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de tickets obtenida exitosamente' })
  findAll(@Query() paginationDto: PaginationDto, @Request() req) {
    console.log('🎫 Controller findAll called with user:', !!req.user);
    return this.itTicketsService.findAll(
      paginationDto,
      paginationDto.busqueda,
      paginationDto.asignado_a,
      req.user,
      paginationDto.estado,
      paginationDto.prioridad,
      paginationDto.categoria,
      paginationDto.estado_excluir,
      paginationDto.estado_incluir,
      paginationDto.sin_asignar,
      paginationDto.con_asignar
    );
  }

  @Get('dashboard')
  @UseGuards(PermisosGuard)
  @RequierePermisos('admin')
  @ApiOperation({ summary: 'Dashboard Admin: Vista general de todos los tickets' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard de tickets obtenido exitosamente' })
  findAllForDashboard(@Query() paginationDto: PaginationDto, @Request() req) {
    return this.itTicketsService.findAllForDashboard(paginationDto, paginationDto.busqueda, req.user);
  }

  @Get('assigned-tickets')
  @UseGuards(JwtAuthGuard)
  @RequierePermisos('it_soluciones')
  @ApiOperation({ summary: 'Mis Tickets Asignados - Vista con diseño adaptable como IT Soluciones' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tickets asignados obtenidos exitosamente' })
  async obtenerMisTicketsAsignados(@Query() paginationDto: PaginationDto, @Request() req) {
    return this.itTicketsService.findAll(
      paginationDto, 
      paginationDto.busqueda, 
      req.user.email, // Forzar filtro por email del técnico asignado
      req.user,
      paginationDto.estado,
      paginationDto.prioridad,
      paginationDto.categoria,
      paginationDto.estado_excluir,
      paginationDto.estado_incluir,
      paginationDto.sin_asignar,
      paginationDto.con_asignar
    );
  }

  @Get('estadisticas-por-tecnico')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener estadísticas de tickets por técnico' })
  @ApiResponse({ status: 200, description: 'Estadísticas por técnico obtenidas exitosamente' })
  // BUG 7 FIX: delegado al service en lugar de usar pool directamente
  obtenerEstadisticasPorTecnico(@UsuarioActual() _user: any) {
    return this.itTicketsService.obtenerEstadisticasPorTecnico(_user);
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de tickets IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estadísticas obtenidas exitosamente' })
  obtenerEstadisticas(@Query() params: { asignado_a?: string }, @Request() req) {
    return this.itTicketsService.obtenerEstadisticas(params, req.user);
  }

  @Get('notificaciones/comentarios')
  @ApiOperation({ summary: 'Obtener notificaciones (polling) de nuevos comentarios en tickets IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notificaciones obtenidas exitosamente' })
  obtenerNotificacionesComentarios(@Query() query: { since?: string }, @Request() req) {
    return this.itTicketsService.obtenerNotificacionesComentarios(query?.since, req.user);
  }

  // BUG 4 FIX: rutas estáticas de conteo movidas ANTES de las rutas con :id
  @Get('comentarios/conteo')
  @ApiOperation({ summary: 'Obtener conteo de comentarios por ticket (batch)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conteos obtenidos exitosamente' })
  obtenerConteoComentarios(@Query() query: { ids?: string }, @Request() req) {
    return this.itTicketsService.obtenerConteoComentarios(query?.ids, req.user);
  }

  @Get('historial/conteo')
  @ApiOperation({ summary: 'Obtener conteo de historial por ticket (batch)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conteos obtenidos exitosamente' })
  obtenerConteoHistorial(@Query() query: { ids?: string }, @Request() req) {
    return this.itTicketsService.obtenerConteoHistorial(query?.ids, req.user);
  }

  // ─── RUTAS CON PARÁMETRO :id — siempre después de las rutas estáticas ────────

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un ticket de IT por ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket obtenido exitosamente' })
  findOne(@Param('id') id: number) {
    return this.itTicketsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermisosGuard)
  @RequierePermisos('it_soluciones')
  @ApiOperation({ summary: 'Actualizar un ticket de IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket actualizado exitosamente' })
  update(@Param('id') id: number, @Body() updateITTicketDto: UpdateITTicketDto) {
    return this.itTicketsService.update(id, updateITTicketDto);
  }

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @RequierePermisos('it_soluciones')
  @ApiOperation({ summary: 'Eliminar un ticket de IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket eliminado exitosamente' })
  remove(@Param('id') id: number) {
    return this.itTicketsService.remove(id);
  }

  @Patch(':id/asignar')
  @UseGuards(PermisosGuard)
  @RequierePermisos('it_soluciones', 'todo')
  @ApiOperation({ summary: 'Asignar ticket IT a un usuario' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Ticket asignado exitosamente' })
  asignarTicket(@Param('id') id: number, @Body() body: { asignado_a: string }, @Request() req) {
    return this.itTicketsService.asignarTicket(id, body.asignado_a, req.user);
  }

  @Patch(':id/estado')
  @UseGuards(PermisosGuard)
  @RequierePermisos('it_soluciones')
  @ApiOperation({ summary: 'Cambiar estado de ticket IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estado cambiado exitosamente' })
  cambiarEstado(@Param('id') id: number, @Body() body: { estado: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado' }, @Request() req) {
    return this.itTicketsService.cambiarEstado(id, body.estado, req.user);
  }

  @Post(':id/comentarios')
  @ApiOperation({ summary: 'Agregar comentario a ticket IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comentario agregado exitosamente' })
  agregarComentario(@Param('id', ParseIntPipe) id: number, @Body() body: { comentario: string }, @Request() req) {
    return this.itTicketsService.agregarComentario(id, body.comentario, req.user);
  }

  @Get(':id/comentarios')
  @ApiOperation({ summary: 'Obtener comentarios de ticket IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comentarios obtenidos exitosamente' })
  obtenerComentarios(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const user = req.user;
    const userEmail = user?.email;
    return this.itTicketsService.obtenerComentariosConPermiso(id, userEmail, user);
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Obtener historial de ticket IT' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Historial obtenido exitosamente' })
  obtenerHistorial(@Param('id') id: number) {
    return this.itTicketsService.obtenerHistorial(id);
  }
}
