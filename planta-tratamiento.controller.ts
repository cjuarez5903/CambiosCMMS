import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlantaTratamientoService } from './planta-tratamiento.service';
import { CrearLecturaDto } from './dto/crear-lectura.dto';
import { ConfigurarPlantaDto } from './dto/configurar-planta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';

@ApiTags('Planta de Tratamiento')
@Controller('planta-tratamiento')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador', 'Administrador de Sucursal')
@ApiBearerAuth()
export class PlantaTratamientoController {
  constructor(private readonly service: PlantaTratamientoService) {}

  // ─── LECTURAS ──────────────────────────────────────────────────────────────

  @Post('lecturas')
  @ApiOperation({
    summary: 'Registrar lectura del contador',
    description:
      'La sucursal se asigna automáticamente del usuario logueado. Fecha y hora son automáticas del servidor.',
  })
  @ApiResponse({ status: 201, description: 'Lectura registrada exitosamente' })
  crearLectura(
    @Body() dto: CrearLecturaDto,
    @UsuarioActual() usuario: any,
  ) {
    return this.service.crearLectura(dto, usuario.id);
  }

  @Get('lecturas')
  @ApiOperation({ summary: 'Listar lecturas registradas' })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaFin', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'porPagina', required: false, type: Number })
  findAll(
    @UsuarioActual() usuario: any,
    @Query('sucursalId') sucursalId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('pagina') pagina?: string,
    @Query('porPagina') porPagina?: string,
  ) {
    return this.service.findAllLecturas(usuario.id, {
      sucursalId: sucursalId ? +sucursalId : undefined,
      fechaInicio,
      fechaFin,
      pagina: pagina ? +pagina : undefined,
      porPagina: porPagina ? +porPagina : undefined,
    });
  }

  @Get('lecturas/:id')
  @ApiOperation({ summary: 'Obtener una lectura por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneLectura(id);
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard / historial de lecturas con indicadores visuales y gráfica',
  })
  @ApiQuery({ name: 'sucursalId', required: false, type: Number })
  getDashboard(
    @UsuarioActual() usuario: any,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.service.getDashboard(usuario.id, sucursalId ? +sucursalId : undefined);
  }

  // ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────

  @Get('configuracion')
  @ApiOperation({ summary: 'Listar todas las configuraciones de plantas' })
  findAllConfiguraciones(@UsuarioActual() usuario: any) {
    return this.service.findAllConfiguraciones(usuario.id);
  }

  @Get('configuracion/:sucursalId')
  @ApiOperation({ summary: 'Obtener configuración de planta por sucursal' })
  getConfiguracion(
    @UsuarioActual() usuario: any,
    @Param('sucursalId', ParseIntPipe) sucursalId: number,
  ) {
    return this.service.getConfiguracion(usuario.id, sucursalId);
  }

  @Post('configuracion')
  @ApiOperation({
    summary: 'Crear o actualizar configuración de planta (caudal de diseño)',
  })
  @ApiResponse({ status: 201, description: 'Configuración guardada' })
  guardarConfiguracion(
    @UsuarioActual() usuario: any,
    @Body() dto: ConfigurarPlantaDto,
  ) {
    return this.service.guardarConfiguracion(usuario.id, dto);
  }
}
