import { Enforcer } from 'casbin-core';
import { Authorizer, AuthorizerOptions, AuthorizationPayload, PermissionGrant } from './types';
import { FacadeState } from './state';
import { EnforcerFactory } from './factory';

export class AuthorizerFacade implements Authorizer {
  private enforcer: Enforcer | null = null;
  private state: FacadeState = new FacadeState();
  private subject = 'current_user';
  private organization = '';
  private ready: Promise<void> = Promise.resolve();
  private basePolicies: string[][] = [];

  public async initialize(options: AuthorizerOptions = {}): Promise<void> {
    this.subject = options.subject || 'current_user';
    this.organization = options.organization || '';
    this.basePolicies = options.policies ? options.policies.map((policy) => [...policy]) : [];

    this.enforcer = await EnforcerFactory.createEnforcer(options);

    if (options.permissions) {
      this.state.setPermissions(options.permissions);
    }

    this.ready = this.syncPolicies();
    await this.ready;
  }

  public getEnforcer(): Enforcer | null {
    return this.enforcer;
  }

  private async ensureReady(): Promise<Enforcer> {
    await this.ready;

    if (!this.enforcer) {
      throw new Error('Authorizer has not been initialized');
    }

    return this.enforcer;
  }

  private async ensureEnforcer(): Promise<Enforcer> {
    if (!this.enforcer) {
      throw new Error('Authorizer has not been initialized');
    }

    return this.enforcer;
  }

  private async replayBasePolicies(enforcer: Enforcer): Promise<void> {
    for (const policy of this.basePolicies) {
      const [ptype, ...rule] = policy;

      if (ptype === 'p') {
        await enforcer.addPolicy(...rule);
        continue;
      }

      if (ptype === 'g') {
        await enforcer.addGroupingPolicy(...rule);
        continue;
      }

      if (ptype === 'g2') {
        await enforcer.addNamedGroupingPolicy('g2', ...rule);
        continue;
      }

      if (ptype === 'g3') {
        await enforcer.addNamedGroupingPolicy('g3', ...rule);
      }
    }
  }

  private async syncPolicies(): Promise<void> {
    const enforcer = await this.ensureEnforcer();

    await enforcer.clearPolicy();
    await this.replayBasePolicies(enforcer);

    const permissions = this.state.getPermissions();
    for (const permission of permissions) {
      await enforcer.addPermissionForUser(
        this.subject,
        permission.resource,
        this.organization,
        permission.action,
        'allow'
      );
    }

    const roles = this.state.getRoles();
    for (const role of roles) {
      await enforcer.addRoleForUser(this.subject, role, this.organization);
    }
  }

  public async can(action: string, resource: string): Promise<boolean> {
    const enforcer = await this.ensureReady();
    return enforcer.enforce(this.subject, resource, this.organization, action);
  }

  public async canAny(actions: string[], resource: string): Promise<boolean> {
    for (const action of actions) {
      if (await this.can(action, resource)) {
        return true;
      }
    }

    return false;
  }

  public async canAll(actions: string[], resource: string): Promise<boolean> {
    for (const action of actions) {
      if (!(await this.can(action, resource))) {
        return false;
      }
    }

    return true;
  }

  public async setPermissions(permissions: PermissionGrant[]): Promise<void> {
    await this.ensureReady();
    this.state.setPermissions(permissions);
    this.ready = this.syncPolicies();
    await this.ready;
  }

  public async addPermission(permission: PermissionGrant): Promise<void> {
    const enforcer = await this.ensureReady();
    this.state.addPermission(permission);
    await enforcer.addPermissionForUser(
      this.subject,
      permission.resource,
      this.organization,
      permission.action,
      'allow'
    );
  }

  public async removePermission(permission: PermissionGrant): Promise<void> {
    const enforcer = await this.ensureReady();
    this.state.removePermission(permission);
    await enforcer.deletePermissionForUser(
      this.subject,
      permission.resource,
      this.organization,
      permission.action,
      'allow'
    );
  }

  public async replacePayload(payload: AuthorizationPayload): Promise<void> {
    await this.ensureReady();
    this.state.replacePayload(payload);
    this.ready = this.syncPolicies();
    await this.ready;
  }
}
