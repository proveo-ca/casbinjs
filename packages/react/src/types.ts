import type {
  AuthorizationPayload,
  Authorizer,
  AuthorizerOptions,
} from '@casbinjs/core';
import type { ReactNode } from 'react';

export interface CasbinContextValue {
  authorizer: Authorizer | null;
  isLoading: boolean;
  error: Error | null;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
  replacePayload(payload: AuthorizationPayload): Promise<void>;
  getEnforcer(): ReturnType<Authorizer['getEnforcer']> | null;
}

export interface CasbinProviderProps {
  children: ReactNode;
  authorizer?: Authorizer | null;
  options?: AuthorizerOptions;
}
