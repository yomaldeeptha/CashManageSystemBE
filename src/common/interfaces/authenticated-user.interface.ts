export interface RolePermissionMap {
  [moduleKey: string]: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    approve: boolean;
    unblock: boolean;
  };
}

export interface ScreenAuthRecord {
  screenId: string;
  formId: string;
  canAccess: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canExport: boolean;
  authLevel: number;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  empNo: string | null;
  designation: string | null;
  roleId: number;
  roleCode: string;
  roleName: string;
  employeeId: number | null;
  companyIds: number[];
  branchIds: number[];
  outletIds: number[];
  departmentIds: number[];
  permissions: RolePermissionMap;
  screenAuthorizations: Record<string, ScreenAuthRecord>;
}
