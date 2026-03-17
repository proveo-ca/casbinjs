import { useContext, useEffect, useMemo, useState } from 'react';
import { CasbinContext } from './context';
import type { CasbinContextValue, CasbinPermissionResult } from './types';

export function useCasbin(): CasbinContextValue {
  const context = useContext(CasbinContext);

  if (!context) {
    throw new Error('useCasbin must be used within an CasbinProvider');
  }

  return context;
}

export function useCan(action: string, resource: string): CasbinPermissionResult {
  const { can, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<Error | null>(providerError);
  const [isLoading, setIsLoading] = useState(providerLoading);

  useEffect(() => {
    let active = true;

    if (providerError) {
      setAllowed(false);
      setError(providerError);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    if (providerLoading) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return () => {
        active = false;
      };
    }

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

    return () => {
      active = false;
    };
  }, [action, can, providerError, providerLoading, resource]);

  return useMemo(
    () => ({
      allowed,
      isLoading,
      error,
    }),
    [allowed, error, isLoading]
  );
}

export function useCanAny(actions: string[], resource: string): CasbinPermissionResult {
  const { canAny, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<Error | null>(providerError);
  const [isLoading, setIsLoading] = useState(providerLoading);

  useEffect(() => {
    let active = true;

    if (providerError) {
      setAllowed(false);
      setError(providerError);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    if (providerLoading) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return () => {
        active = false;
      };
    }

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

    return () => {
      active = false;
    };
  }, [actions, canAny, providerError, providerLoading, resource]);

  return useMemo(
    () => ({
      allowed,
      isLoading,
      error,
    }),
    [allowed, error, isLoading]
  );
}

export function useCanAll(actions: string[], resource: string): CasbinPermissionResult {
  const { canAll, isLoading: providerLoading, error: providerError } = useCasbin();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<Error | null>(providerError);
  const [isLoading, setIsLoading] = useState(providerLoading);

  useEffect(() => {
    let active = true;

    if (providerError) {
      setAllowed(false);
      setError(providerError);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    if (providerLoading) {
      setAllowed(false);
      setError(null);
      setIsLoading(true);
      return () => {
        active = false;
      };
    }

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

    return () => {
      active = false;
    };
  }, [actions, canAll, providerError, providerLoading, resource]);

  return useMemo(
    () => ({
      allowed,
      isLoading,
      error,
    }),
    [allowed, error, isLoading]
  );
}
