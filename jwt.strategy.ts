import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../../entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
      relations: ['rol'] // Cargar la relación del rol
    });

    if (!usuario || usuario.estado !== 'activo') {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      rolId: payload.rolId,
      rol: usuario.rol,
      permisos: usuario.rol?.permisos || {}
    };
  }
}
