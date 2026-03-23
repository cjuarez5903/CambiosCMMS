import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// Módulos
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { PaisesModule } from './modules/paises/paises.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { ActivosModule } from './modules/activos/activos.module';
import { OrdenesTrabajoModule } from './modules/ordenes-trabajo/ordenes-trabajo.module';
import { CapexModule } from './modules/capex/capex.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ITTicketsModule } from './modules/it-tickets/it-tickets.module';
import { PlantaTratamientoModule } from './modules/planta-tratamiento/planta-tratamiento.module';

// Guards, Interceptors, Filters
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RespuestaInterceptor } from './common/interceptors/response.interceptor';
import { FiltroExcepcionesHttp } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsuariosModule,
    RolesModule,
    PaisesModule,
    SucursalesModule,
    ProveedoresModule,
    ActivosModule,
    CapexModule,
    OrdenesTrabajoModule,
    UploadsModule,
    ITTicketsModule,
    PlantaTratamientoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RespuestaInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: FiltroExcepcionesHttp,
    },
  ],
})
export class AppModule {}
