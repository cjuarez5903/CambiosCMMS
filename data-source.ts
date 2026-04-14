const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');

config();

// Certificado SSL para RDS (requerido por --require_secure_transport=ON)
const sslCertPath = path.join(process.env.HOME || '/home/ubuntu', 'cmms-backend', 'global-bundle.pem');
const sslOptions = fs.existsSync(sslCertPath)
  ? { ca: fs.readFileSync(sslCertPath) }
  : undefined;

// Entidades cargadas en orden explícito para evitar importaciones circulares
// (capex-historial <-> capex-sucursal, usuario <-> sucursal)
const { Role } = require('./entities/role.entity');
const { ITTicket } = require('./entities/it-ticket.entity');
const { Pais } = require('./entities/pais.entity');
const { Proveedor } = require('./entities/proveedor.entity');
const { Sucursal } = require('./entities/sucursal.entity');
const { Activo } = require('./entities/activo.entity');
const { Usuario } = require('./entities/usuario.entity');
const { OrdenTrabajo } = require('./entities/orden-trabajo.entity');
const { HistorialOrdenTrabajo } = require('./entities/historial-orden-trabajo.entity');
const { CapexSucursal } = require('./entities/capex-sucursal.entity');
const { CapexHistorial } = require('./entities/capex-historial.entity');
const { ConfiguracionPlanta } = require('./entities/configuracion-planta.entity');
const { LecturaPlanta } = require('./entities/lectura-planta.entity');
const { ITTicketComentario } = require('./modules/it-tickets/entities/it-ticket-comentario.entity');
const { ITTicketHistorial } = require('./modules/it-tickets/entities/it-ticket-historial.entity');
const { OrdenTrabajoComentario } = require('./entities/orden-trabajo-comentario.entity');

const configService = {
  get: (key: string) => process.env[key],
};

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('DB_HOST'),
  port: +configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [
    Role,
    ITTicket,
    Pais,
    Proveedor,
    Sucursal,
    Activo,
    Usuario,
    OrdenTrabajo,
    HistorialOrdenTrabajo,
    CapexSucursal,
    CapexHistorial,
    ConfiguracionPlanta,
    LecturaPlanta,
    ITTicketComentario,
    ITTicketHistorial,
    OrdenTrabajoComentario,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: sslOptions,
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  charset: 'utf8mb4',
});
