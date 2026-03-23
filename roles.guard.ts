import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard de roles
 * Verifica que el usuario tenga uno de los roles requeridos
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const tieneRol = rolesRequeridos.some((rol) => user.rol?.nombre === rol);

    if (!tieneRol) {
      throw new ForbiddenException(
        `No tienes permisos suficientes. Se requiere uno de los siguientes roles: ${rolesRequeridos.join(', ')}`
      );
    }

    return true;
  }
}
