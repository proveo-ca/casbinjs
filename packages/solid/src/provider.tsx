import type { Authorizer } from "@casbinjs/core";
import { createAuthorizer } from "@casbinjs/core";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { CasbinContext } from "./context";
import type { CasbinProviderProps } from "./types";

function createNotReadyError(): Error {
  return new Error("Authorizer is not ready");
}

export function CasbinProvider(props: CasbinProviderProps) {
  const [authorizer, setAuthorizer] = createSignal<Authorizer | null>(props.authorizer ?? null);
  const [isLoading, setIsLoading] = createSignal<boolean>(!props.authorizer && !!props.options);
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    const authorizerProp = props.authorizer;
    const options = props.options;

    if (authorizerProp) {
      setAuthorizer(() => authorizerProp);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!options) {
      setAuthorizer(null);
      setIsLoading(false);
      setError(new Error("CasbinProvider requires either an authorizer or options"));
      return;
    }

    setIsLoading(true);
    setError(null);

    let active = true;
    onCleanup(() => {
      active = false;
    });

    void createAuthorizer(options)
      .then((created) => {
        if (!active) {
          return;
        }

        setAuthorizer(() => created);
        setIsLoading(false);
      })
      .catch((nextError: unknown) => {
        if (!active) {
          return;
        }

        setAuthorizer(null);
        setIsLoading(false);
        setError(nextError instanceof Error ? nextError : new Error("Failed to create authorizer"));
      });
  });

  const value = {
    authorizer,
    isLoading,
    error,
    async can(action: string, resource: string): Promise<boolean> {
      const auth = authorizer();
      if (!auth) {
        return false;
      }

      return auth.can(action, resource);
    },
    async canAny(actions: string[], resource: string): Promise<boolean> {
      const auth = authorizer();
      if (!auth) {
        return false;
      }

      return auth.canAny(actions, resource);
    },
    async canAll(actions: string[], resource: string): Promise<boolean> {
      const auth = authorizer();
      if (!auth) {
        return false;
      }

      return auth.canAll(actions, resource);
    },
    async addPolicy(policy: string[]): Promise<void> {
      const auth = authorizer();
      if (!auth) {
        throw createNotReadyError();
      }

      await auth.addPolicy(policy);
    },
    async removePolicy(policy: string[]): Promise<void> {
      const auth = authorizer();
      if (!auth) {
        throw createNotReadyError();
      }

      await auth.removePolicy(policy);
    },
    async replacePolicies(policies: string[][]): Promise<void> {
      const auth = authorizer();
      if (!auth) {
        throw createNotReadyError();
      }

      await auth.replacePolicies(policies);
    },
    getEnforcer() {
      return authorizer()?.getEnforcer() ?? null;
    },
  };

  return <CasbinContext.Provider value={value}>{props.children}</CasbinContext.Provider>;
}
