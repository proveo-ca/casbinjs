import React from 'react';
import { waitFor } from '@testing-library/react';
import { createAuthorizer } from '@casbinjs/core';
import { describe, expect, it } from 'vitest';
import { getEndpointResponseFixture, toAuthorizerOptions } from './fixtures/endpoint-response';
import { MODEL_FIXTURE } from './fixtures/model';
import { renderHookTest } from './utils/test-hook';
import { CasbinProvider } from '../provider';
import type { CasbinContextValue, CasbinPermissionResult } from '../types';
import { useCan, useCanAll, useCanAny, useCasbin } from '../use-casbin';

type HookResult = Pick<
  CasbinContextValue,
  | 'authorizer'
  | 'isLoading'
  | 'error'
  | 'can'
  | 'canAny'
  | 'canAll'
  | 'addPolicy'
  | 'removePolicy'
  | 'replacePolicies'
  | 'getEnforcer'
>;

function renderCasbinHook<TResult>(hook: () => TResult, wrapper?: React.ComponentType<{ children: React.ReactNode }>) {
  let latestResult: TResult | undefined;

  renderHookTest({
    hook,
    props: {},
    onResult: (result) => {
      latestResult = result;
    },
    wrapper,
  });

  return {
    getResult(): TResult {
      if (!latestResult) {
        throw new Error('Hook result is not available yet');
      }

      return latestResult;
    },
  };
}

async function createFixtureAuthorizer() {
  const response = getEndpointResponseFixture();

  return createAuthorizer({
    ...toAuthorizerOptions(response),
    model: MODEL_FIXTURE,
  });
}

describe('@casbinjs/react integration', () => {
  it('throws when useCasbin is used outside CasbinProvider', () => {
    expect(() => renderHookTest({ hook: () => useCasbin(), props: {} })).toThrow(
      'useCasbin must be used within an CasbinProvider'
    );
  });

  it('provides an existing authorizer through CasbinProvider', async () => {
    const authorizer = await createFixtureAuthorizer();

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), WrapperWithAuthorizer);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBe(authorizer);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.getEnforcer()).not.toBeNull();
    });
  });

  it('creates an authorizer from options and exposes it through the hook', async () => {
    const response = getEndpointResponseFixture();

    function WrapperWithOptions({ children }: { children: React.ReactNode }) {
      return (
        <CasbinProvider
          options={{
            ...toAuthorizerOptions(response),
            model: MODEL_FIXTURE,
          }}
        >
          {children}
        </CasbinProvider>
      );
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), WrapperWithOptions);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).not.toBeNull();
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    await expect(getResult().can('read', 'document:direct-2')).resolves.toBe(true);
    await expect(getResult().can('read', 'document:public-2')).resolves.toBe(true);
  });

  it('supports useCan for React-friendly permission checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<CasbinPermissionResult>(
      () => useCan('read', 'document:123'),
      WrapperWithAuthorizer
    );

    await waitFor(() => {
      const result = getResult();

      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(true);
    });
  });

  it('supports useCanAny for multi-action checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<CasbinPermissionResult>(
      () => useCanAny(['read', 'update'], 'document:123'),
      WrapperWithAuthorizer
    );

    await waitFor(() => {
      const result = getResult();

      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(true);
    });
  });

  it('supports useCanAll for multi-action checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<CasbinPermissionResult>(
      () => useCanAll(['read', 'update'], 'document:123'),
      WrapperWithAuthorizer
    );

    await waitFor(() => {
      const result = getResult();

      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.allowed).toBe(false);
    });
  });

  it('passes addPolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [],
    });

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), WrapperWithAuthorizer);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBe(authorizer);
      expect(result.isLoading).toBe(false);
    });

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(false);

    await getResult().addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']);

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(true);
  });

  it('passes removePolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']],
    });

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), WrapperWithAuthorizer);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBe(authorizer);
      expect(result.isLoading).toBe(false);
    });

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(true);

    await getResult().removePolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']);

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('passes replacePolicies through and updates canonical raw policy access', async () => {
    const authorizer = await createFixtureAuthorizer();

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), WrapperWithAuthorizer);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBe(authorizer);
      expect(result.isLoading).toBe(false);
    });

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(true);
    await expect(getResult().can('write', 'document:direct-1')).resolves.toBe(false);

    await getResult().replacePolicies([['p', 'alice', 'document:direct-1', 'org-1', 'write', 'allow']]);

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(false);
    await expect(getResult().can('write', 'document:direct-1')).resolves.toBe(true);
  });

  it('exposes error state when neither authorizer nor options are provided', async () => {
    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), EmptyWrapper);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBeNull();
      expect(result.isLoading).toBe(false);
      expect(result.error).toEqual(
        new Error('CasbinProvider requires either an authorizer or options')
      );
    });

    await expect(getResult().can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('rejects addPolicy when authorizer is not ready', async () => {
    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    const { getResult } = renderCasbinHook<HookResult>(() => useCasbin(), EmptyWrapper);

    await waitFor(() => {
      const result = getResult();

      expect(result.authorizer).toBeNull();
      expect(result.isLoading).toBe(false);
    });

    await expect(
      getResult().addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow'])
    ).rejects.toThrow('Authorizer is not ready');
  });
});
