import { createEffect, createSignal, onCleanup, useContext } from 'solid-js';
import { CasbinContext } from './context';
import type { CasbinContextValue, CasbinPermissionResult } from './types';

export function useCasbin(): CasbinContextValue {
  const context = useContext(CasbinContext);

  if (!context) {
    throw new Error('useCasbin must be used within a CasbinProvider');
  }

  return context;
}

export function useCan(action: string, resource: string): CasbinPermissionResult {
  const { can, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(providerError());
  const [isLoading, setIsLoading] = createSignal(providerLoading());

  createEffect(() => {
    if (providerError()) {
      setAllowed(false);
      setError(providerError());
      setIsLoading(false);
      return;
    }

    if (providerLoading()) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return;
    }

    let active = true;
    onCleanup(() => {
      active = false;
    });

    async function checkPermission() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAllowed = await can(action, resource);

        if (!active) {
          return;
        }

        setAllowed(nextAllowed);
        setIsLoading(false);
      } catch (nextError: unknown) {
        if (!active) {
          return;
        }

        setAllowed(false);
        setError(nextError instanceof Error ? nextError : new Error('Permission check failed'));
        setIsLoading(false);
      }
    }

    void checkPermission();
  });

  return { allowed, isLoading, error };
}

export function useCanAny(actions: string[], resource: string): CasbinPermissionResult {
  const { canAny, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(providerError());
  const [isLoading, setIsLoading] = createSignal(providerLoading());

  createEffect(() => {
    if (providerError()) {
      setAllowed(false);
      setError(providerError());
      setIsLoading(false);
      return;
    }

    if (providerLoading()) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return;
    }

    let active = true;
    onCleanup(() => {
      active = false;
    });

    async function checkPermission() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAllowed = await canAny(actions, resource);

        if (!active) {
          return;
        }

        setAllowed(nextAllowed);
        setIsLoading(false);
      } catch (nextError: unknown) {
        if (!active) {
          return;
        }

        setAllowed(false);
        setError(nextError instanceof Error ? nextError : new Error('Permission check failed'));
        setIsLoading(false);
      }
    }

    void checkPermission();
  });

  return { allowed, isLoading, error };
}

export function useCanAll(actions: string[], resource: string): CasbinPermissionResult {
  const { canAll, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(providerError());
  const [isLoading, setIsLoading] = createSignal(providerLoading());

  createEffect(() => {
    if (providerError()) {
      setAllowed(false);
      setError(providerError());
      setIsLoading(false);
      return;
    }

    if (providerLoading()) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return;
    }

    let active = true;
    onCleanup(() => {
      active = false;
    });

    async function checkPermission() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAllowed = await canAll(actions, resource);

        if (!active) {
          return;
        }

        setAllowed(nextAllowed);
        setIsLoading(false);
      } catch (nextError: unknown) {
        if (!active) {
          return;
        }

        setAllowed(false);
        setError(nextError instanceof Error ? nextError : new Error('Permission check failed'));
        setIsLoading(false);
      }
    }

    void checkPermission();
  });

  return { allowed, isLoading, error };
}
