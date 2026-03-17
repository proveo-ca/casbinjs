# @casbinjs/solid

Solid.js bindings for [CasbinJS](https://github.com/proveo-ca/casbinjs). Provides a context provider and reactive primitives for permission checks in Solid.js applications. For thorough examples including Casbin model setup, role-based access, resource grouping, and policy mutation patterns, see the [main README](https://github.com/proveo-ca/casbinjs#readme).

## Installation

```bash
npm install @casbinjs/solid @casbinjs/core solid-js
```

## Setup

Wrap your app with `CasbinProvider`. Pass either a pre-built `authorizer` or `options` to create one automatically:

```tsx
import { CasbinProvider } from '@casbinjs/solid';

// Option A — pass options, provider creates the authorizer
function App() {
  return (
    <CasbinProvider
      options={{
        subject: 'alice',
        organization: 'org-1',
        model: MY_MODEL,
        policies: fetchedPolicies,
      }}
    >
      <Routes />
    </CasbinProvider>
  );
}

// Option B — pass a pre-built authorizer
const authorizer = await createAuthorizer({ ... });

function App() {
  return (
    <CasbinProvider authorizer={authorizer}>
      <Routes />
    </CasbinProvider>
  );
}
```

## Primitives

### `useCan(action, resource)`

Check a single permission. Returns `{ allowed, isLoading, error }` as signal accessors.

```tsx
import { useCan } from '@casbinjs/solid';

function DeleteButton() {
  const { allowed, isLoading } = useCan('delete', 'document:123');

  return (
    <Show when={!isLoading() && allowed()}>
      <button>Delete</button>
    </Show>
  );
}
```

### `useCanAny(actions, resource)`

Returns `allowed()` as `true` if the user has **at least one** of the given actions.

```tsx
const { allowed } = useCanAny(['read', 'write'], 'document:123');
```

### `useCanAll(actions, resource)`

Returns `allowed()` as `true` only if the user has **all** of the given actions.

```tsx
const { allowed } = useCanAll(['read', 'write'], 'document:123');
```

### `useCasbin()`

Access the full context value — useful for policy mutations or direct enforcer access.

```tsx
import { useCasbin } from '@casbinjs/solid';

function PolicyManager() {
  const { addPolicy, isLoading, error } = useCasbin();

  const grant = () =>
    addPolicy(['p', 'alice', 'document:123', 'org-1', 'write', 'allow']);

  return <button onClick={grant}>Grant write access</button>;
}
```

> **Note:** `authorizer()`, `isLoading()`, and `error()` returned from `useCasbin()` are signal accessors — call them as functions to read the current value.

## API

### `CasbinProvider`

| Prop | Type | Description |
|---|---|---|
| `authorizer` | `Authorizer \| null` | A pre-built authorizer instance. |
| `options` | `AuthorizerOptions` | Options to create an authorizer. Used when `authorizer` is not provided. |
| `children` | `JSX.Element` | |

### `CasbinPermissionResult`

| Field | Type | Description |
|---|---|---|
| `allowed` | `Accessor<boolean>` | Whether the action is permitted. |
| `isLoading` | `Accessor<boolean>` | `true` while the permission check or authorizer initialization is in progress. |
| `error` | `Accessor<Error \| null>` | Set if initialization or the permission check failed. |
