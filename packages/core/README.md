# @casbinjs/core

Framework-agnostic authorization core for [CasbinJS](https://github.com/proveo-ca/casbinjs). For thorough examples including role-based access, resource grouping, action inheritance, and framework integrations, see the [main README](https://github.com/proveo-ca/casbinjs#readme). Wraps [casbin-core](https://github.com/apache/casbin-core) with a clean async API for permission checks and runtime policy management.

## Installation

```bash
npm install @casbinjs/core
```

## Usage

### Create an authorizer

```ts
import { createAuthorizer } from '@casbinjs/core';

const authorizer = await createAuthorizer({
  subject: 'alice',
  organization: 'org-1',
  model: `
    [request_definition]
    r = sub, res, org, act
    [policy_definition]
    p = sub, res, org, act, eft
    [policy_effect]
    e = some(where (p.eft == allow))
    [matchers]
    m = r.sub == p.sub && r.org == p.org && r.res == p.res && r.act == p.act
  `,
  policies: [
    ['p', 'alice', 'document:123', 'org-1', 'read', 'allow'],
  ],
});
```

### Check permissions

```ts
await authorizer.can('read', 'document:123');       // true
await authorizer.canAny(['read', 'write'], 'document:123'); // true
await authorizer.canAll(['read', 'write'], 'document:123'); // false
```

### Mutate policies at runtime

```ts
await authorizer.addPolicy(['p', 'alice', 'document:123', 'org-1', 'write', 'allow']);
await authorizer.removePolicy(['p', 'alice', 'document:123', 'org-1', 'write', 'allow']);
await authorizer.replacePolicies([
  ['p', 'alice', 'document:456', 'org-1', 'read', 'allow'],
]);
```

## API

### `createAuthorizer(options?)`

Creates and initializes an `Authorizer` instance.

| Option | Type | Description |
|---|---|---|
| `model` | `string` | Casbin model definition. Falls back to a basic `sub, obj, act` model if omitted. |
| `policies` | `string[][]` | Initial policy rules. |
| `subject` | `string` | The current user/subject for permission checks. |
| `organization` | `string` | The organization scope for permission checks. |

### `Authorizer`

| Method | Signature | Description |
|---|---|---|
| `can` | `(action, resource) => Promise<boolean>` | Check a single permission. |
| `canAny` | `(actions, resource) => Promise<boolean>` | Returns `true` if at least one action is allowed. |
| `canAll` | `(actions, resource) => Promise<boolean>` | Returns `true` only if all actions are allowed. |
| `addPolicy` | `(policy) => Promise<void>` | Add a policy rule. |
| `removePolicy` | `(policy) => Promise<void>` | Remove a policy rule. |
| `replacePolicies` | `(policies) => Promise<void>` | Replace all policies atomically. |
| `getEnforcer` | `() => Enforcer \| null` | Access the underlying casbin-core enforcer. |
