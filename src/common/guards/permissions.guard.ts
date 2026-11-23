import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSION_KEY,
  RequiredPermissionMeta,
  ROLES_KEY,
} from '../decorators/auth.decorators';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) return false;

    // System Administrators bypass module permission blocks
    if (user.roleCode === 'ADM') return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.roleCode) && !requiredRoles.includes(user.roleName)) {
        throw new ForbiddenException('Insufficient role privilege for this operation.');
      }
    }

    const requiredPerm = this.reflector.getAllAndOverride<RequiredPermissionMeta>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredPerm) {
      const modPerm = user.permissions?.[requiredPerm.module];
      if (!modPerm || !modPerm[requiredPerm.action]) {
        throw new ForbiddenException(
          `Permission denied: requires "${requiredPerm.action}" on module "${requiredPerm.module}".`,
        );
      }
    }

    return true;
  }
}
