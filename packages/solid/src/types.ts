import type { Authorizer, AuthorizerOptions } from '@casbinjs/core';
import type { Accessor, JSX } from 'solid-js';

export interface CasbinContextValue {
  authorizer: Accessor<Authorizer | null>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | null>;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
  addPolicy(policy: string[]): Promise<void>;
  removePolicy(policy: string[]): Promise<void>;
  replacePolicies(policies: string[][]): Promise<void>;
  getEnforcer(): ReturnType<Authorizer['getEnforcer']> | null;
}

export interface CasbinProviderProps {
  children: JSX.Element;
  authorizer?: Authorizer | null;
  options?: AuthorizerOptions;
}

export interface CasbinPermissionResult {
  allowed: Accessor<boolean>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | null>;
}
