import React from 'react';
import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAuthorizer } from '@casbinjs/core';
import { renderHookTest } from './utils/test-hook';
import { getEndpointResponseFixture, toAuthorizerOptions } from './fixtures/endpoint-response';
import { MODEL_FIXTURE } from './fixtures/model';
import { CasbinProvider } from '../provider';
import { useCasbin } from '../use-casbin';
import type { CasbinContextValue } from '../types';

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
      'useAuthz must be used within an AuthzProvider'
    );
  });

  it('consumes a realistic endpoint-derived authorizer through context', async () => {
    const authorizer = await createFixtureAuthorizer();
    let latestValue: CasbinContextValue | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestValue = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestValue).toBeDefined();
      expect(latestValue?.authorizer).toBe(authorizer);
      expect(latestValue?.isLoading).toBe(false);
      expect(latestValue?.error).toBeNull();
    });

    await expect(latestValue!.can('read', 'document:direct-1')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:public-1')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:role-editor-1')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:grouped-7')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:manage-1')).resolves.toBe(true);
    await expect(latestValue!.can('manage', 'document:manage-1')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:quarterly-1')).resolves.toBe(true);
    await expect(latestValue!.can('manage', 'document:quarterly-1')).resolves.toBe(true);
    await expect(latestValue!.can('write', 'document:public-1')).resolves.toBe(false);
    await expect(latestValue!.can('delete', 'document:direct-1')).resolves.toBe(false);
    expect(latestValue!.getEnforcer()).not.toBeNull();
  });

  it('passes replacePayload through and updates effective access', async () => {
    const authorizer = await createFixtureAuthorizer();
    let latestValue: CasbinContextValue | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestValue = result;
      },
      wrapper: WrapperWithAuthorizer,
    });

    await waitFor(() => {
      expect(latestValue?.authorizer).toBe(authorizer);
      expect(latestValue?.isLoading).toBe(false);
    });

    await expect(latestValue!.can('read', 'document:direct-1')).resolves.toBe(true);
    await expect(latestValue!.can('write', 'document:direct-1')).resolves.toBe(false);

    await latestValue!.replacePayload({
      roles: [],
      permissions: [{ action: 'write', resource: 'document:direct-1' }],
    });

    await expect(latestValue!.can('read', 'document:direct-1')).resolves.toBe(false);
    await expect(latestValue!.can('write', 'document:direct-1')).resolves.toBe(true);
  });

  it('creates an authorizer from options and exposes it through context', async () => {
    const response = getEndpointResponseFixture();
    let latestValue: CasbinContextValue | undefined;

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
        latestValue = result;
      },
      wrapper: WrapperWithOptions,
    });

    await waitFor(() => {
      expect(latestValue).toBeDefined();
      expect(latestValue?.authorizer).not.toBeNull();
      expect(latestValue?.isLoading).toBe(false);
      expect(latestValue?.error).toBeNull();
    });

    await expect(latestValue!.can('read', 'document:direct-2')).resolves.toBe(true);
    await expect(latestValue!.can('read', 'document:public-2')).resolves.toBe(true);
  });

  it('exposes error state when neither authorizer nor options are provided', async () => {
    let latestValue: CasbinContextValue | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestValue = result;
      },
      wrapper: EmptyWrapper,
    });

    await waitFor(() => {
      expect(latestValue).toBeDefined();
      expect(latestValue?.authorizer).toBeNull();
      expect(latestValue?.isLoading).toBe(false);
      expect(latestValue?.error).toEqual(
        new Error('CasbinProvider requires either an authorizer or options')
      );
    });

    await expect(latestValue!.can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('rejects replacePayload when authorizer is not ready', async () => {
    let latestValue: CasbinContextValue | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    renderHookTest({
      hook: () => useCasbin(),
      props: {},
      onResult: (result) => {
        latestValue = result;
      },
      wrapper: EmptyWrapper,
    });

    await waitFor(() => {
      expect(latestValue?.authorizer).toBeNull();
      expect(latestValue?.isLoading).toBe(false);
    });

    await expect(
      latestValue!.replacePayload({
        roles: [],
        permissions: [{ action: 'read', resource: 'document:direct-1' }],
      })
    ).rejects.toThrow('Authorizer is not ready');
  });
});
