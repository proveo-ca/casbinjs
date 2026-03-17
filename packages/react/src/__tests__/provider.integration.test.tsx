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
    let latestHook: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.authorizer).toBe(authorizer);
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toBeNull();
      expect(latestHook?.getEnforcer()).not.toBeNull();
    });
  });

  it('creates an authorizer from options and exposes it through the hook', async () => {
    const response = getEndpointResponseFixture();
    let latestHook: HookResult | undefined;

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

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithOptions,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.authorizer).not.toBeNull();
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toBeNull();
    });

    await expect(latestHook!.can('read', 'document:direct-2')).resolves.toBe(true);
    await expect(latestHook!.can('read', 'document:public-2')).resolves.toBe(true);
  });

  it('supports useCan for React-friendly permission checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });
    let latestHook: CasbinPermissionResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCan('read', 'document:123'),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toBeNull();
      expect(latestHook?.allowed).toBe(true);
    });
  });

  it('supports useCanAny for multi-action checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });
    let latestHook: CasbinPermissionResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCanAny(['read', 'update'], 'document:123'),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toBeNull();
      expect(latestHook?.allowed).toBe(true);
    });
  });

  it('supports useCanAll for multi-action checks', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
    });
    let latestHook: CasbinPermissionResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCanAll(['read', 'update'], 'document:123'),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toBeNull();
      expect(latestHook?.allowed).toBe(false);
    });
  });

  it('passes addPolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [],
    });
    let latestHook: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook?.authorizer).toBe(authorizer);
      expect(latestHook?.isLoading).toBe(false);
    });

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(false);

    await latestHook!.addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']);

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(true);
  });

  it('passes removePolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']],
    });
    let latestHook: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook?.authorizer).toBe(authorizer);
      expect(latestHook?.isLoading).toBe(false);
    });

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(true);

    await latestHook!.removePolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']);

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('passes replacePolicies through and updates canonical raw policy access', async () => {
    const authorizer = await createFixtureAuthorizer();
    let latestHook: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestHook?.authorizer).toBe(authorizer);
      expect(latestHook?.isLoading).toBe(false);
    });

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(true);
    await expect(latestHook!.can('write', 'document:direct-1')).resolves.toBe(false);

    await latestHook!.replacePolicies([
      ['p', 'alice', 'document:direct-1', 'org-1', 'write', 'allow'],
    ]);

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(false);
    await expect(latestHook!.can('write', 'document:direct-1')).resolves.toBe(true);
  });

  it('exposes error state when neither authorizer nor options are provided', async () => {
    let latestHook: HookResult | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: EmptyWrapper,
    });

    await waitFor(() => {
      expect(latestHook).toBeDefined();
      expect(latestHook?.authorizer).toBeNull();
      expect(latestHook?.isLoading).toBe(false);
      expect(latestHook?.error).toEqual(
        new Error('CasbinProvider requires either an authorizer or options')
      );
    });

    await expect(latestHook!.can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('rejects addPolicy when authorizer is not ready', async () => {
    let latestHook: HookResult | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestHook = result;
      },
      wrapper: EmptyWrapper,
    });

    await waitFor(() => {
      expect(latestHook?.authorizer).toBeNull();
      expect(latestHook?.isLoading).toBe(false);
    });

    await expect(
      latestHook!.addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow'])
    ).rejects.toThrow('Authorizer is not ready');
  });
})
