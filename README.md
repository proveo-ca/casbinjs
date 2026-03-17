# CasbinJS

A framework-agnostic authorization library for JavaScript/TypeScript, built on top of [casbin-core](https://github.com/apache/casbin-core). Provides a clean async API for permission checks and runtime policy management, with first-class bindings for React and Solid.js.

## Packages

| Package | Description |
|---|---|
| [`@casbinjs/core`](./packages/core) | Framework-agnostic authorization core |
| [`@casbinjs/react`](./packages/react) | React context provider and hooks |
| [`@casbinjs/solid`](./packages/solid) | Solid.js context provider and primitives |

---

## Design

- `casbin-core` performs enforcement
- `@casbinjs/core` provides a consumer-friendly authorizer API
- `@casbinjs/react` / `@casbinjs/solid` provide provider and hook ergonomics
- your application owns fetching, persistence, and reconciliation

No built-in fetching. No built-in persistence. Methods like `addPolicy` and `replacePolicies` update in-memory state — your app wires them into backend flows.

---

## Concepts

CasbinJS uses [Casbin](https://casbin.org) models to define authorization rules. A model describes the shape of requests, policies, roles, and how they are matched.

### Policy format

Policies are arrays of strings. The columns depend on your model definition:

```ts
// [type, subject, resource, organization, action, effect]
['p', 'alice', 'document:123', 'org-1', 'read', 'allow']
```

### Role inheritance (`g`)

Assign a user to a role within an organization:
```ts
['g', 'alice', 'role:editor', 'org-1']
```

### Resource grouping (`g2`)

Group a resource under a parent resource:
```ts
['g2', 'document:123', 'folder:reports', 'org-1']
```

### Action inheritance (`g3`)

Make one action imply another:
```ts
['g3', 'read', 'manage']  // manage implies read
```

---

## Example model

The examples below use this model, which supports multi-tenant RBAC with resource and action grouping:

```
[request_definition]
r = sub, res, org, act

[policy_definition]
p = sub, res, org, act, eft

[role_definition]
g = _, _, _
g2 = _, _, _
g3 = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = (p.sub == 'public' || r.sub == p.sub || g(r.sub, p.sub, r.org)) &&
    (r.org == p.org) &&
    (r.res == p.res || keyMatch(r.res, p.res) || g2(r.res, p.res, r.org)) &&
    (r.act == p.act || g3(r.act, p.act))
```

---

## Core usage

### Basic permission check

```ts
import { createAuthorizer } from '@casbinjs/core';

const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: MY_MODEL,
  policies: [
    ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'],
  ],
});

await authorizer.can('read', 'document:123');  // true
await authorizer.can('write', 'document:123'); // false
```

### Role-based access

```ts
const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: MY_MODEL,
  policies: [
    ['p', 'role:editor', 'document:123', 'org-1', 'read', 'allow'],
    ['p', 'role:editor', 'document:123', 'org-1', 'write', 'allow'],
    ['g', 'alice', 'role:editor', 'org-1'],
  ],
});

await authorizer.can('read', 'document:123');  // true — via role:editor
await authorizer.can('write', 'document:123'); // true — via role:editor
```

### Resource grouping

```ts
const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: MY_MODEL,
  policies: [
    ['p', 'alice', 'folder:reports', 'org-1', 'read', 'allow'],
    ['g2', 'document:q1', 'folder:reports', 'org-1'],
  ],
});

await authorizer.can('read', 'document:q1'); // true — document belongs to the folder
```

### Action inheritance

```ts
const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: MY_MODEL,
  policies: [
    ['p', 'alice', 'document:123', 'org-1', 'manage', 'allow'],
    ['g3', 'read', 'manage'],
    ['g3', 'write', 'manage'],
  ],
});

await authorizer.can('read', 'document:123');   // true — implied by manage
await authorizer.can('write', 'document:123');  // true — implied by manage
await authorizer.can('delete', 'document:123'); // false
```

### Public resources

Use `'public'` as the subject to allow access for all users:

```ts
const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: MY_MODEL,
  policies: [
    ['p', 'public', 'document:home', 'org-1', 'read', 'allow'],
  ],
});

await authorizer.can('read', 'document:home'); // true for any subject
```

### Multi-action checks

```ts
await authorizer.canAny(['read', 'write'], 'document:123'); // true if at least one allowed
await authorizer.canAll(['read', 'write'], 'document:123'); // true only if both allowed
```

### Runtime policy mutation

```ts
await authorizer.addPolicy(['p', 'alice', 'document:456', 'org-1', 'read', 'allow']);
await authorizer.removePolicy(['p', 'alice', 'document:456', 'org-1', 'read', 'allow']);

// Replace all policies atomically (e.g. after re-fetching from an API)
await authorizer.replacePolicies(newPoliciesFromApi);
```

### Optimistic revoke with rollback

```ts
const revokedPolicy = ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'];

await authorizer.removePolicy(revokedPolicy); // optimistic local update

const response = await fetch('/api/permissions/revoke', {
  method: 'POST',
  body: JSON.stringify({ policy: revokedPolicy }),
});

if (!response.ok) {
  // roll back to server-canonical state
  const serverPolicies = await response.json() as string[][];
  await authorizer.replacePolicies(serverPolicies);
}
```

### Loading from an API response

```ts
type PolicyApiResponse = {
  subject: string;
  organization?: string;
  policies: string[][];
};

const data = await fetch('/api/authorization/policies').then(r => r.json()) as PolicyApiResponse;

const authorizer = await createAuthorizer({
  subject: data.subject,
  organization: data.organization,
  model: MY_MODEL,
  policies: data.policies,
});
```

---

## React usage

### Provider setup

```tsx
import { CasbinProvider } from '@casbinjs/react';
import { createAuthorizer } from '@casbinjs/core';
import { useState, useEffect } from 'react';

function AuthorizationProvider({ children }: { children: React.ReactNode }) {
  const [authorizer, setAuthorizer] = useState(null);

  useEffect(() => {
    fetch('/api/authorization')
      .then(res => res.json())
      .then(data => createAuthorizer({ ...data, model: MY_MODEL }))
      .then(setAuthorizer);
  }, []);

  return (
    <CasbinProvider authorizer={authorizer}>
      {children}
    </CasbinProvider>
  );
}
```

Or let the provider handle initialization by passing `options` directly:

```tsx
<CasbinProvider options={{ subject, organization, model: MY_MODEL, policies }}>
  <Routes />
</CasbinProvider>
```

### Guarding UI elements

```tsx
import { useCan } from '@casbinjs/react';

function DocumentActions({ docId }: { docId: string }) {
  const { allowed: canEdit, isLoading } = useCan('write', docId);
  const { allowed: canDelete } = useCan('delete', docId);

  if (isLoading) return <Spinner />;

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### Checking multiple actions

```tsx
import { useCanAny, useCanAll } from '@casbinjs/react';

// Show toolbar if user can do at least one action
function Toolbar({ docId }: { docId: string }) {
  const { allowed } = useCanAny(['read', 'write', 'delete'], docId);
  if (!allowed) return null;
  return <div className="toolbar">...</div>;
}

// Show publish button only if user has full control
function PublishButton({ docId }: { docId: string }) {
  const { allowed } = useCanAll(['write', 'publish'], docId);
  return allowed ? <button>Publish</button> : null;
}
```

### Policy mutation from a component

```tsx
import { useCasbin } from '@casbinjs/react';

function ShareDialog({ docId, userId }: { docId: string; userId: string }) {
  const { addPolicy, removePolicy } = useCasbin();

  const share = () =>
    addPolicy(['p', userId, docId, 'org-1', 'read', 'allow']);

  const revoke = () =>
    removePolicy(['p', userId, docId, 'org-1', 'read', 'allow']);

  return (
    <>
      <button onClick={share}>Share</button>
      <button onClick={revoke}>Revoke</button>
    </>
  );
}
```

---

## Solid.js usage

The Solid.js API mirrors React's with one key difference: permission results are **signal accessors** — read them by calling as a function (`allowed()` not `allowed`).

### Provider setup

```tsx
import { CasbinProvider } from '@casbinjs/solid';

function App() {
  return (
    <CasbinProvider options={{ subject, organization, model: MY_MODEL, policies }}>
      <Routes />
    </CasbinProvider>
  );
}
```

### Guarding UI elements

```tsx
import { useCan } from '@casbinjs/solid';
import { Show } from 'solid-js';

function DocumentActions(props: { docId: string }) {
  const { allowed: canEdit, isLoading } = useCan('write', props.docId);
  const { allowed: canDelete } = useCan('delete', props.docId);

  return (
    <Show when={!isLoading()}>
      <Show when={canEdit()}>
        <button>Edit</button>
      </Show>
      <Show when={canDelete()}>
        <button>Delete</button>
      </Show>
    </Show>
  );
}
```

### Checking multiple actions

```tsx
import { useCanAny, useCanAll } from '@casbinjs/solid';
import { Show } from 'solid-js';

function Toolbar(props: { docId: string }) {
  const { allowed } = useCanAny(['read', 'write', 'delete'], props.docId);
  return <Show when={allowed()}><div class="toolbar">...</div></Show>;
}
```

### Policy mutation from a component

```tsx
import { useCasbin } from '@casbinjs/solid';

function ShareDialog(props: { docId: string; userId: string }) {
  const { addPolicy, removePolicy } = useCasbin();

  const share = () =>
    addPolicy(['p', props.userId, props.docId, 'org-1', 'read', 'allow']);

  const revoke = () =>
    removePolicy(['p', props.userId, props.docId, 'org-1', 'read', 'allow']);

  return (
    <>
      <button onClick={share}>Share</button>
      <button onClick={revoke}>Revoke</button>
    </>
  );
}
```

---

## Spec files

Design and contract references live under `_spec/`. These should stay aligned with the implementation.

---

## License

ISC
