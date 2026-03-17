# @casbinjs/react

React bindings for [CasbinJS](https://github.com/proveo-ca/casbinjs). Provides a context provider and hooks for permission checks in React applications. For thorough examples including Casbin model setup, role-based access, resource grouping, and policy mutation patterns, see the [main README](https://github.com/proveo-ca/casbinjs#readme).

## Installation

```bash
npm install @casbinjs/react @casbinjs/core
```

## Setup

Wrap your app with `CasbinProvider`. Pass either a pre-built `authorizer` or `options` to create one automatically:

```tsx
import { CasbinProvider } from '@casbinjs/react';

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

## Hooks

### `useCan(action, resource)`

Check a single permission. Returns `{ allowed, isLoading, error }`.

```tsx
import { useCan } from '@casbinjs/react';

function DeleteButton() {
  const { allowed, isLoading } = useCan('delete', 'document:123');

  if (isLoading) return null;
  return allowed ? <button>Delete</button> : null;
}
```

### `useCanAny(actions, resource)`

Returns `allowed: true` if the user has **at least one** of the given actions.

```tsx
const { allowed } = useCanAny(['read', 'write'], 'document:123');
```

### `useCanAll(actions, resource)`

Returns `allowed: true` only if the user has **all** of the given actions.

```tsx
const { allowed } = useCanAll(['read', 'write'], 'document:123');
```

### `useCasbin()`

Access the full context value — useful for policy mutations or direct enforcer access.

```tsx
import { useCasbin } from '@casbinjs/react';

function PolicyManager() {
  const { addPolicy, removePolicy, replacePolicies, isLoading, error } = useCasbin();

  const grant = () =>
    addPolicy(['p', 'alice', 'document:123', 'org-1', 'write', 'allow']);

  return <button onClick={grant}>Grant write access</button>;
}
```

## API

### `CasbinProvider`

| Prop | Type | Description |
|---|---|---|
| `authorizer` | `Authorizer \| null` | A pre-built authorizer instance. |
| `options` | `AuthorizerOptions` | Options to create an authorizer. Used when `authorizer` is not provided. |
| `children` | `ReactNode` | |

### `CasbinPermissionResult`

| Field | Type | Description |
|---|---|---|
| `allowed` | `boolean` | Whether the action is permitted. |
| `isLoading` | `boolean` | `true` while the permission check or authorizer initialization is in progress. |
| `error` | `Error \| null` | Set if initialization or the permission check failed. |
