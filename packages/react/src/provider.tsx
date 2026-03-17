import { createAuthorizer } from '@casbinjs/core';
import { useEffect, useMemo, useState } from 'react';
import { CasbinContext } from './context';
import type { CasbinProviderProps } from './types';
import type { AuthorizationPayload, Authorizer } from '@casbinjs/core';

function createNotReadyError(): Error {
  return new Error('Authorizer is not ready');
}

export function CasbinProvider({
  children,
  authorizer: authorizerProp,
  options,
}: CasbinProviderProps) {
  const [authorizer, setAuthorizer] = useState<Authorizer | null>(authorizerProp ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!authorizerProp && !!options);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    if (authorizerProp) {
      setAuthorizer(authorizerProp);
      setIsLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    if (!options) {
      setAuthorizer(null);
      setIsLoading(false);
      setError(new Error('CasbinProvider requires either an authorizer or options'));
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    setError(null);

    void createAuthorizer(options)
      .then((createdAuthorizer) => {
        if (!active) {
          return;
        }

        setAuthorizer(createdAuthorizer);
        setIsLoading(false);
      })
      .catch((nextError: unknown) => {
        if (!active) {
          return;
        }

        setAuthorizer(null);
        setIsLoading(false);
        setError(nextError instanceof Error ? nextError : new Error('Failed to create authorizer'));
      });

    return () => {
      active = false;
    };
  }, [authorizerProp, options]);

  const value = useMemo(() => {
    return {
      authorizer,
      isLoading,
      error,
      async can(action: string, resource: string): Promise<boolean> {
        if (!authorizer) {
          return false;
        }

        return authorizer.can(action, resource);
      },
      async canAny(actions: string[], resource: string): Promise<boolean> {
        if (!authorizer) {
          return false;
        }

        return authorizer.canAny(actions, resource);
      },
      async canAll(actions: string[], resource: string): Promise<boolean> {
        if (!authorizer) {
          return false;
        }

        return authorizer.canAll(actions, resource);
      },
      async replacePayload(payload: AuthorizationPayload): Promise<void> {
        if (!authorizer) {
          throw createNotReadyError();
        }

        await authorizer.replacePayload(payload);
      },
      getEnforcer() {
        return authorizer?.getEnforcer() ?? null;
      },
    };
  }, [authorizer, error, isLoading]);

  return <CasbinContext.Provider value={value}>{children}</CasbinContext.Provider>;
}
