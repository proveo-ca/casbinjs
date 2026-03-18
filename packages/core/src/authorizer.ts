import { Enforcer } from "casbin-core";
import { Authorizer, AuthorizerOptions } from "./types";
import { EnforcerFactory } from "./factory";

function rowsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export class AuthorizerFacade implements Authorizer {
  private enforcer: Enforcer | null = null;
  private subject = "current_user";
  private organization = "";
  private ready: Promise<void> = Promise.resolve();
  private policySnapshot: string[][] = [];

  public async initialize(options: AuthorizerOptions = {}): Promise<void> {
    this.subject = options.subject || "current_user";
    this.organization = options.organization || "";
    this.policySnapshot = options.policies ? options.policies.map((policy) => [...policy]) : [];

    this.enforcer = await EnforcerFactory.createEnforcer(options);
    this.ready = this.syncPolicies();
    await this.ready;
  }

  public getEnforcer(): Enforcer | null {
    return this.enforcer;
  }

  private async ensureReady(): Promise<Enforcer> {
    await this.ready;

    if (!this.enforcer) {
      throw new Error("Authorizer has not been initialized");
    }

    return this.enforcer;
  }

  private async ensureEnforcer(): Promise<Enforcer> {
    if (!this.enforcer) {
      throw new Error("Authorizer has not been initialized");
    }

    return this.enforcer;
  }

  private async addPolicyRow(enforcer: Enforcer, policy: string[]): Promise<void> {
    const [ptype, ...rule] = policy;

    if (ptype === "p") {
      await enforcer.addPolicy(...rule);
      return;
    }

    if (ptype === "g") {
      await enforcer.addGroupingPolicy(...rule);
      return;
    }

    if (ptype === "g2") {
      await enforcer.addNamedGroupingPolicy("g2", ...rule);
      return;
    }

    if (ptype === "g3") {
      await enforcer.addNamedGroupingPolicy("g3", ...rule);
      return;
    }

    throw new Error(`Unsupported policy type: ${ptype}`);
  }

  private async removePolicyRow(enforcer: Enforcer, policy: string[]): Promise<void> {
    const [ptype, ...rule] = policy;

    if (ptype === "p") {
      await enforcer.removePolicy(...rule);
      return;
    }

    if (ptype === "g") {
      await enforcer.removeGroupingPolicy(...rule);
      return;
    }

    if (ptype === "g2") {
      await enforcer.removeNamedGroupingPolicy("g2", ...rule);
      return;
    }

    if (ptype === "g3") {
      await enforcer.removeNamedGroupingPolicy("g3", ...rule);
      return;
    }

    throw new Error(`Unsupported policy type: ${ptype}`);
  }

  private async replayPolicySnapshot(enforcer: Enforcer): Promise<void> {
    for (const policy of this.policySnapshot) {
      await this.addPolicyRow(enforcer, policy);
    }
  }

  private async syncPolicies(): Promise<void> {
    const enforcer = await this.ensureEnforcer();

    await enforcer.clearPolicy();
    await this.replayPolicySnapshot(enforcer);
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

  public async addPolicy(policy: string[]): Promise<void> {
    const enforcer = await this.ensureReady();
    this.policySnapshot.push([...policy]);
    await this.addPolicyRow(enforcer, policy);
  }

  public async removePolicy(policy: string[]): Promise<void> {
    const enforcer = await this.ensureReady();
    const index = this.policySnapshot.findIndex((current) => rowsEqual(current, policy));

    if (index !== -1) {
      this.policySnapshot.splice(index, 1);
    }

    await this.removePolicyRow(enforcer, policy);
  }

  public async replacePolicies(policies: string[][]): Promise<void> {
    await this.ensureReady();
    this.policySnapshot = policies.map((policy) => [...policy]);
    this.ready = this.syncPolicies();
    await this.ready;
  }
}
