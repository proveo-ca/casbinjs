import { PermissionGrant, AuthorizationPayload } from './types';

export class FacadeState {
  private permissions: PermissionGrant[] = [];
  private roles: string[] = [];

  public setPermissions(permissions: PermissionGrant[]): void {
    this.permissions = [...permissions];
  }

  public addPermission(permission: PermissionGrant): void {
    this.permissions.push(permission);
  }

  public removePermission(permission: PermissionGrant): void {
    this.permissions = this.permissions.filter(
      (p) => p.action !== permission.action || p.resource !== permission.resource
    );
  }

  public replacePayload(payload: AuthorizationPayload): void {
    this.permissions = [...payload.permissions];
    this.roles = payload.roles ? [...payload.roles] : [];
  }

  public getPermissions(): PermissionGrant[] {
    return this.permissions;
  }

  public getRoles(): string[] {
    return this.roles;
  }
}
