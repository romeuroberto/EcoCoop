import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUserDto } from '@ecocoop/shared';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserDto = request.user;

    if (!user) return false;

    const hasPermission = user.permissions.some(
      (p) => p.module === required.module && (p.action === required.action || p.action === 'MANAGE'),
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Você não tem permissão para executar esta ação',
        code: 'UNAUTHORIZED_PROFILE',
      });
    }

    return true;
  }
}
