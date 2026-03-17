export interface PermissionGrant {
  action: string;
  resource: string;
}

export interface AuthorizationPayload {
  roles?: string[];
  permissions: PermissionGrant[];
}

export interface AuthorizerOptions {
  model?: string;
  permissions?: PermissionGrant[];
  policies?: string[][];
  subject?: string;
  organization?: string;
}

export interface Authorizer {
  getEnforcer(): any | null;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
  setPermissions(permissions: PermissionGrant[]): Promise<void>;
  addPermission(permission: PermissionGrant): Promise<void>;
  removePermission(permission: PermissionGrant): Promise<void>;
  replacePayload(payload: AuthorizationPayload): Promise<void>;
}
