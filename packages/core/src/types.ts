export interface AuthorizerOptions {
  model?: string;
  policies?: string[][];
  subject?: string;
  organization?: string;
}

export interface Authorizer {
  getEnforcer(): any | null;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
  addPolicy(policy: string[]): Promise<void>;
  removePolicy(policy: string[]): Promise<void>;
  replacePolicies(policies: string[][]): Promise<void>;
}
