import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface RequiredPermissionMeta {
  module: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'unblock';
}

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (
  module: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'unblock',
) => SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermissionMeta);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
