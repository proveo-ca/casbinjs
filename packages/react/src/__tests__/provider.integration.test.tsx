import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createAuthorizer } from '@casbinjs/core';
import { describe, expect, it } from 'vitest';
import { getEndpointResponseFixture, toAuthorizerOptions } from './fixtures/endpoint-response';
import { MODEL_FIXTURE } from './fixtures/model';
import { renderHookTest } from './utils/test-hook';
import { CasbinProvider } from '../provider';
import type { CasbinContextValue } from '../types';
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

function UseCasbinProbe({
  onResult,
}: {
  onResult: (result: HookResult) => void;
}) {
  const result = useCasbin();

  React.useEffect(() => {
    onResult(result);
  }, [onResult, result]);

  return null;
}

function UseCanView({
  action,
  resource,
}: {
  action: string;
  resource: string;
}) {
  const { allowed, isLoading, error } = useCan(action, resource);

  return (
    <>
      <div data-testid="allowed">{String(allowed)}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="error">{error?.message ?? ''}</div>
    </>
  );
}

function UseCanAnyView({
  actions,
  resource,
}: {
  actions: string[];
  resource: string;
}) {
  const { allowed, isLoading, error } = useCanAny(actions, resource);

  return (
    <>
      <div data-testid="allowed">{String(allowed)}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="error">{error?.message ?? ''}</div>
    </>
  );
}

function UseCanAllView({
  actions,
  resource,
}: {
  actions: string[];
  resource: string;
}) {
  const { allowed, isLoading, error } = useCanAll(actions, resource);

  return (
    <>
      <div data-testid="allowed">{String(allowed)}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="error">{error?.message ?? ''}</div>
    </>
  );
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
      'useCasbin must be used within a CasbinProvider'
    );
  });

  it('provides an existing authorizer through CasbinProvider', async () => {
    const authorizer = await createFixtureAuthorizer();
    let latestResult: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    render(
      <WrapperWithAuthorizer>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBe(authorizer);
      expect(latestResult!.isLoading).toBe(false);
      expect(latestResult!.error).toBeNull();
      expect(latestResult!.getEnforcer()).not.toBeNull();
    });
  });

  it('creates an authorizer from options and exposes it through the hook', async () => {
    const response = getEndpointResponseFixture();
    let latestResult: HookResult | undefined;

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

    render(
      <WrapperWithOptions>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </WrapperWithOptions>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).not.toBeNull();
      expect(latestResult!.isLoading).toBe(false);
      expect(latestResult!.error).toBeNull();
    });

    await expect(latestResult!.can('read', 'document:direct-2')).resolves.toBe(true);
    await expect(latestResult!.can('read', 'document:public-2')).resolves.toBe(true);
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

    render(
      <WrapperWithAuthorizer>
        <UseCanView action="read" resource="document:123" />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('');
      expect(screen.getByTestId('allowed').textContent).toBe('true');
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

    render(
      <WrapperWithAuthorizer>
        <UseCanAnyView actions={['read', 'update']} resource="document:123" />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('');
      expect(screen.getByTestId('allowed').textContent).toBe('true');
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

    render(
      <WrapperWithAuthorizer>
        <UseCanAllView actions={['read', 'update']} resource="document:123" />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('');
      expect(screen.getByTestId('allowed').textContent).toBe('false');
    });
  });

  it('passes addPolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [],
    });
    let latestResult: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    render(
      <WrapperWithAuthorizer>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBe(authorizer);
      expect(latestResult!.isLoading).toBe(false);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(false);

    await act(async () => {
      await latestResult!.addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(true);
  });

  it('passes removePolicy through and updates authorization state', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow']],
    });
    let latestResult: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    render(
      <WrapperWithAuthorizer>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBe(authorizer);
      expect(latestResult!.isLoading).toBe(false);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(true);

    await act(async () => {
      await latestResult!.removePolicy([
        'p',
        'alice',
        'document:direct-1',
        'org-1',
        'read',
        'allow',
      ]);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('passes replacePolicies through and updates canonical raw policy access', async () => {
    const authorizer = await createFixtureAuthorizer();
    let latestResult: HookResult | undefined;

    function WrapperWithAuthorizer({ children }: { children: React.ReactNode }) {
      return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
    }

    render(
      <WrapperWithAuthorizer>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </WrapperWithAuthorizer>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBe(authorizer);
      expect(latestResult!.isLoading).toBe(false);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(true);
    await expect(latestResult!.can('write', 'document:direct-1')).resolves.toBe(false);

    await act(async () => {
      await latestResult!.replacePolicies([
        ['p', 'alice', 'document:direct-1', 'org-1', 'write', 'allow'],
      ]);
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(false);
    await expect(latestResult!.can('write', 'document:direct-1')).resolves.toBe(true);
  });

  it('exposes error state when neither authorizer nor options are provided', async () => {
    let latestResult: HookResult | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    render(
      <EmptyWrapper>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </EmptyWrapper>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBeNull();
      expect(latestResult!.isLoading).toBe(false);
      expect(latestResult!.error).toEqual(
        new Error('CasbinProvider requires either an authorizer or options')
      );
    });

    await expect(latestResult!.can('read', 'document:direct-1')).resolves.toBe(false);
  });

  it('rejects addPolicy when authorizer is not ready', async () => {
    let latestResult: HookResult | undefined;

    function EmptyWrapper({ children }: { children: React.ReactNode }) {
      return <CasbinProvider>{children}</CasbinProvider>;
    }

    render(
      <EmptyWrapper>
        <UseCasbinProbe
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </EmptyWrapper>
    );

    await waitFor(() => {
      expect(latestResult).toBeDefined();
      expect(latestResult!.authorizer).toBeNull();
      expect(latestResult!.isLoading).toBe(false);
    });

    await expect(
      latestResult!.addPolicy(['p', 'alice', 'document:direct-1', 'org-1', 'read', 'allow'])
    ).rejects.toThrow('Authorizer is not ready');
  });
});
