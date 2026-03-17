# casbinjs

A lightweight authorization workspace built around `casbin-core`, with:

- `@casbinjs/core` — a framework-agnostic authorizer facade
- `@casbinjs/react` — thin React bindings over the core authorizer

The library is designed to keep responsibilities clear:

- `casbin-core` performs enforcement
- `@casbinjs/core` provides a consumer-friendly authorizer API
- `@casbinjs/react` provides provider and hook ergonomics
- your application owns fetching, persistence, and reconciliation

---

## Packages

### `@casbinjs/core`

Framework-agnostic authorization facade.

Main concepts:

- `createAuthorizer(options)`
- `can(action, resource)`
- `canAny(actions, resource)`
- `canAll(actions, resource)`
- `addPolicy(policy)`
- `removePolicy(policy)`
- `replacePolicies(policies)`

### `@casbinjs/react`

Thin React bindings over `@casbinjs/core`.

Main exports:

- `CasbinProvider`
- `useCasbin`
- `useCan`
- `useCanAny`
- `useCanAll`

---

# Initializing from an API response

A common pattern is:

1. fetch authorization data from your API
2. map that response into `createAuthorizer(...)`
3. use the returned authorizer directly or pass it into React

`organization` is optional. In this library it acts as the current authorization scope passed into Casbin enforcement. If your app does not need scoped checks, you can omit it.

## Example: raw policy snapshot response

```ts
import { createAuthorizer } from '@casbinjs/core';

type PolicyApiResponse = {
  subject: string;
  organization?: string;
  policies: string[][];
};

async function loadAuthorizerFromPolicies() {
  const response = await fetch('/api/authorization/policies');
  const data = (await response.json()) as PolicyApiResponse;

  return createAuthorizer({
    subject: data.subject,
    organization: data.organization,
    policies: data.policies,
  });
}
```

---

# Core usage

## Create an authorizer

```ts
import { createAuthorizer } from '@casbinjs/core';

const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
});
```

`organization` is optional and acts as scope for scoped authorization checks.

## Check permissions

```ts
const canRead = await authorizer.can('read', 'document:123');
const canAny = await authorizer.canAny(['read', 'update'], 'document:123');
const canAll = await authorizer.canAll(['read', 'update'], 'document:123');
```

## Add a policy

```ts
await authorizer.addPolicy(['p', 'alice', 'document:123', 'org-1', 'update', 'allow']);
```

## Remove a policy

```ts
await authorizer.removePolicy(['p', 'alice', 'document:123', 'org-1', 'update', 'allow']);
```

## Replace policies

```ts
await authorizer.replacePolicies([
  ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'],
  ['g', 'alice', 'editor', 'org-1'],
]);
```

## Example: optimistic revoke with canonical rollback

```ts
const revokedPolicy = ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'];

await authorizer.removePolicy(revokedPolicy);

const response = await fetch('/api/permissions/revoke', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({ policy: revokedPolicy }),
});

if (!response.ok) {
  const serverPolicies = (await response.json()) as string[][];
  await authorizer.replacePolicies(serverPolicies);
}
```

## Access the underlying enforcer

```ts
const enforcer = authorizer.getEnforcer();
```

This can be useful for advanced Casbin behavior, but `@casbinjs/core` should remain the primary consumer API.

---

# React usage

## 1. Create an authorizer from application data

```ts
import { createAuthorizer } from '@casbinjs/core';

const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
});
```

You can omit `organization` if your app does not use scoped authorization.

## 2. Provide it to React

```tsx
import { CasbinProvider } from '@casbinjs/react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
}
```

## 3. Consume it with `useCan`

```tsx
import { useCan } from '@casbinjs/react';

export function DocumentActions() {
  const { allowed, isLoading, error } = useCan('read', 'document:123');

  if (isLoading) return <p>Loading authorization...</p>;
  if (error) return <p>{error.message}</p>;

  return allowed ? <button>Open document</button> : <p>Access denied</p>;
}
```

## 4. Use `useCasbin` for direct access to policy helpers

```tsx
import { useCasbin } from '@casbinjs/react';

export function RefreshPoliciesButton() {
  const { replacePolicies } = useCasbin();

  async function handleRefresh() {
    const apiPolicies = [
      ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'],
      ['p', 'alice', 'document:123', 'org-1', 'update', 'allow'],
    ];

    await replacePolicies(apiPolicies);
  }

  return <button onClick={() => void handleRefresh()}>Refresh policies</button>;
}
```

---

## React: initialize from API data

```tsx
import { useEffect, useState } from 'react';
import { createAuthorizer } from '@casbinjs/core';
import { CasbinProvider } from '@casbinjs/react';

type PolicyApiResponse = {
  subject: string;
  organization?: string;
  policies: string[][];
};

export function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const [authorizer, setAuthorizer] = useState<Awaited<ReturnType<typeof createAuthorizer>> | null>(
    null
  );

  useEffect(() => {
    async function loadAuthorization() {
      const response = await fetch('/api/authorization/policies');
      const data = (await response.json()) as PolicyApiResponse;

      const nextAuthorizer = await createAuthorizer({
        subject: data.subject,
        organization: data.organization,
        policies: data.policies,
      });

      setAuthorizer(nextAuthorizer);
    }

    void loadAuthorization();
  }, []);

  if (!authorizer) {
    return <p>Loading authorization...</p>;
  }

  return <CasbinProvider authorizer={authorizer}>{children}</CasbinProvider>;
}
```

---

## React: provider-created authorizer

If you do not already have an authorizer instance, you can pass `options` and let the provider create one.

```tsx
import { CasbinProvider } from '@casbinjs/react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CasbinProvider
      options={{
        subject: 'alice',
        organization: 'org-1',
        policies: [['p', 'alice', 'document:123', 'org-1', 'read', 'allow']],
      }}
    >
      {children}
    </CasbinProvider>
  );
}
```

`organization` remains optional here as well.

---

## React: mutate policies directly

```tsx
import { useCasbin } from '@casbinjs/react';

export function GrantAccessButton() {
  const { addPolicy } = useCasbin();

  async function handleClick() {
    await addPolicy(['p', 'alice', 'document:temp-1', 'org-1', 'read', 'allow']);
  }

  return <button onClick={() => void handleClick()}>Grant access</button>;
}
```

## React: additional hook helpers

Use `useCanAny` and `useCanAll` for common multi-action checks.

```tsx
import { useCanAll, useCanAny } from '@casbinjs/react';

export function MultiActionExample() {
  const readOrUpdate = useCanAny(['read', 'update'], 'document:123');
  const readAndUpdate = useCanAll(['read', 'update'], 'document:123');

  if (readOrUpdate.isLoading || readAndUpdate.isLoading) {
    return <p>Loading authorization...</p>;
  }

  return (
    <>
      <p>Any allowed: {String(readOrUpdate.allowed)}</p>
      <p>All allowed: {String(readAndUpdate.allowed)}</p>
    </>
  );
}
```

---

# Design notes

## Thin React layer

`@casbinjs/react` does not own authorization logic. It only exposes the core authorizer through React context.

## No built-in fetching

This library does not fetch authorization data for you. Your app is responsible for:

- loading policies
- sending mutations to your backend
- deciding between local mutation and canonical replacement

## No built-in persistence

Methods like `addPolicy`, `removePolicy`, and `replacePolicies` update local in-memory state unless your app wires them into backend persistence flows.

---

# Current terminology

- policy snapshot: raw Casbin-style policies used as in-memory authorization state
- canonical replacement: replacing local state with server/API-consistent policies
- organization: optional scope value passed into Casbin enforcement

---

# Spec files

Design and contract references live under `_spec/`.

For example:

- `_spec/core/data-contracts.puml`

These spec files should stay aligned with the implementation and public docs.

---

# Status

This repository is an active workspace. APIs may evolve as the core and React bindings are refined.
