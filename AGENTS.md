# ROADMAP: Casbin-Core JS Library

## Contributor Guidance

This file serves as roadmap context and implementation guidance for contributors making changes to this repository.

### Current implementation boundaries

Preserve these boundaries when making changes:

- `casbin-core` is the enforcement engine
- `@casbinjs/core` is the framework-agnostic authorizer facade
- `@casbinjs/react` is a thin React integration layer over the core package
- applications own fetching, persistence, reconciliation, and optimistic update strategy

### Current policy-first model

The current implementation is policy-first.

There is one in-memory authorization source of truth:

- the current policy snapshot

Primary mutation APIs:

- `addPolicy(policy)`
- `removePolicy(policy)`
- `replacePolicies(policies)`

Contributors should preserve this model in:

- implementation
- docs
- examples
- tests
- specs
- naming
- comments

Do not reintroduce a second in-memory authorization layer without a strong reason and corresponding spec/doc updates.

### Spec sync requirement

Files under `_spec/` are design references and must stay aligned with implementation when public contracts or semantics change.

Contributors must check whether their changes affect:

- public data contracts
- component or package boundaries
- initialization flow
- synchronization or mutation semantics
- React integration behavior
- documented usage flows

If a change affects any of those areas, update the relevant existing `_spec` file.

If no current spec file adequately represents the change, add a new `_spec` file instead of leaving the design undocumented.

Current spec areas include:

- `_spec/core/data-contracts.puml`
- `_spec/core/components.puml`
- `_spec/core/usage.puml`
- `_spec/react/components.puml`
- `_spec/react/init-sequence.puml`
- `_spec/react/usage.puml`

### Documentation expectations

When updating docs:

- explain React usage first, then plain core usage in human-facing docs
- do not imply built-in fetching
- do not imply built-in persistence
- keep React framed as a thin wrapper over core
- describe policies as the in-memory source of truth
- describe `replacePolicies(...)` as canonical replacement from a server/API response

## High-Level Goal

Build a lightweight, production-ready authorization library for JavaScript and TypeScript, powered by `casbin-core` v1.0.0 and exposing a simple API inspired by `casbin-js/src/CAuthorizer.ts`.

The primary goal is to provide:

- a vanilla-ready core package for JavaScript and TypeScript
- optional framework bindings for React and SolidJS
- a small, consistent API for checking permissions in browser and server environments
- a stable initialization contract that can be hydrated from any HTTP, RPC, or in-memory source

At a high level:

- `casbin-core` should remain the enforcement engine
- `casbinjs/core` should be the vanilla-ready facade over `casbin-core`
- `casbinjs/react` should provide ready-to-use React exports such as providers, hooks, and convenience helpers

Example target interface:

```ts
interface Authorizer {
  getEnforcer(): Enforcer | null;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
}
```

This interface may also expose convenience mutation methods such as:

- `addPolicy(...)`
- `removePolicy(...)`
- `replacePolicies(...)`

These methods should be understood as local in-memory policy updates unless the consumer explicitly wires them into backend persistence.

## Package Strategy

Preferred package names:

- `casbinjs/core`
- `casbinjs/react`
- `casbinjs/solid`

If registry naming constraints require scoped packages, use:

- `@casbinjs/core`
- `@casbinjs/react`
- `@casbinjs/solid`

The preferred structure is a monorepo, not separate repositories.

Reasons:

- shared types and test utilities
- consistent release process
- easier cross-package refactors
- framework packages should remain thin wrappers over the core package
- React and Solid packages are integration layers over the same authorizer contract

Proposed layout:

```text
packages/
├── core/       # published as casbinjs/core
├── react/      # published as casbinjs/react
├── solid/      # published as casbinjs/solid
└── adapters/   # optional adapters and integrations
```

## Responsibility Boundaries

A core design rule is to keep the boundaries between packages explicit.

### `casbin-core` owns

- enforcer implementation
- model-driven authorization semantics
- matcher evaluation
- policy processing
- role and grouping logic
- low-level enforcement APIs

### `casbinjs/core` owns

- a vanilla-ready `Authorizer` facade over `casbin-core`
- ergonomic initialization contracts
- convenience methods such as `can`, `canAny`, and `canAll`
- in-memory policy snapshot mutation helpers
- access to the underlying enforcer

`casbinjs/core` should not re-implement enforcement semantics.

### `casbinjs/react` owns

- React provider wiring
- React context integration
- hooks such as `useCasbin()`
- optional convenience helpers built on top of `casbinjs/core`

`casbinjs/react` should not own fetching, persistence, or core authorization semantics.

## Design Principles

- Minimal core: keep the core package focused on a clean facade over `casbin-core`
- Framework agnostic: React and Solid bindings should depend on the core package, not reimplement logic
- Transport agnostic: do not couple the library to tRPC, REST, GraphQL, or any specific client
- TypeScript first: strong typings, sensible defaults, and minimal friction for consumers
- Client and server friendly: usable in browser apps, SSR environments, and backend services
- Model-aware: preserve access to Casbin’s full model and policy capabilities
- Incrementally adoptable: support direct policy initialization and policy replacement flows
- Bundle conscious: avoid unnecessary dependencies in the core package
- Consumer oriented: support provider and hook usage patterns without embedding data-fetching concerns

## Non-Goals for Initial Versions

These are explicitly out of scope for the first release:

- building a backend authorization service
- shipping every adapter up front
- complete feature parity with all existing Casbin JS libraries on day one
- framework-specific logic inside the core package
- coupling the package to tRPC, React Query, Clerk, or any other application-specific dependency
- automatically persisting authorization mutations to a backend
- re-implementing Casbin enforcement semantics in `casbinjs/core`
- prematurely optimizing around every runtime before the API is stable

## Core Contracts

A key requirement is defining the contract expected from an external endpoint.

The consumer may use tRPC and React, but this library should remain agnostic. The library should accept a transport-friendly policy snapshot from any source and leave data fetching to the application.

### External endpoint contract

The library should define a baseline policy snapshot shape that an arbitrary endpoint can return.

Baseline example:

```ts
type PolicySnapshot = string[][];
```

This contract should be:

- serializable over HTTP or RPC
- independent of framework and client library
- sufficient to initialize the `casbinjs/core` authorizer facade
- compatible with Casbin model and grouping semantics

The goal is not to prescribe a tRPC procedure, REST route, or GraphQL schema. The goal is to document the shape of the data the library expects when initializing authorization state.

### Core initialization contract

The core package should accept authorizer initialization data such as:

```ts
interface AuthorizerOptions {
  model?: string;
  policies?: string[][];
  subject?: string;
  organization?: string;
}
```

### React consumption contract

The React package should expose providers and hooks that operate on `casbinjs/core` authorizer state, but do not perform data fetching themselves.

Applications should be able to:

- fetch authorization data however they want
- create or update an authorizer from that policy snapshot
- pass either an authorizer or policy-derived input into React bindings
- consume permission helpers through hooks

Example application flow:

1. application fetches policy snapshot from an endpoint
2. application creates or updates a `casbinjs/core` authorizer
3. React provider exposes the current authorizer through context
4. hooks expose `can`, `canAny`, `canAll`, and convenience helpers

## Synchronization Model

A core planning decision is to keep synchronization responsibilities outside the library.

`casbinjs/core` should own:

- in-memory policy snapshot
- local permission checks
- local in-memory policy mutation methods
- hydration from caller-provided policies or model data
- delegation to `casbin-core`

The consumer application should own:

- fetching initialization data from an API, RPC endpoint, file, or other source
- persisting authorization mutations to a backend
- deciding between optimistic updates, canonical refetch, or reconciliation flows
- handling backend failures and rollback behavior

This means methods such as `addPolicy(...)`, `removePolicy(...)`, and `replacePolicies(...)` should be treated as local authorizer update methods unless the consumer explicitly wires them into backend persistence flows.

Recommended mutation patterns:

### Canonical refetch

1. consumer sends mutation to backend
2. backend persists updated authorization data
3. consumer refetches policies
4. consumer replaces local authorizer state

### Optimistic update with reconciliation

1. consumer updates local authorizer state
2. consumer sends mutation to backend
3. consumer reconciles with the backend response or rolls back on failure

The library should support both patterns, but should not choose one for the consumer.

## Worker Support

Web Worker support may provide value for:

- large policy sets
- expensive model or policy hydration
- frequent authorization checks in UI-heavy applications
- keeping authorization work off the main thread

However, worker support should not be part of the initial core design.

Reasons:

- not every runtime provides Web Workers
- worker execution introduces async boundaries into a sync-friendly API
- direct `getEnforcer()` access becomes more complicated if the enforcer lives in another thread
- initial usage is expected to be in-process with policy snapshots already available in memory

Recommendation:

- keep `casbinjs/core` in-process by default
- design contracts so that a worker-backed implementation can be added later
- consider a future separate package or alternate runtime mode for worker-backed authorizers

## Phases and Milestones

### Phase 1: Core package

Deliver a usable `casbinjs/core` package.

Scope:

- initialize repository and package layout
- add `casbin-core@1.0.0`
- define the transport-friendly policy snapshot contract
- define the main `Authorizer` facade API
- support constructing an authorizer from a model and policy set
- expose `getEnforcer()`
- implement:
  - `can(action, resource)`
  - `canAny(actions, resource)`
  - `canAll(actions, resource)`
  - policy mutation methods such as `addPolicy`, `removePolicy`, and `replacePolicies`

Initial concerns to resolve:

- whether `can(...)` should remain sync only, or support async depending on enforcer behavior
- how user, org, and subject should be represented in the API
- how closely to mirror `casbin-js/src/CAuthorizer.ts`
- whether to expose a class, factory functions, or both

Suggested baseline API:

```ts
interface AuthorizerOptions {
  model?: string;
  policies?: string[][];
  subject?: string;
  organization?: string;
}

interface Authorizer {
  getEnforcer(): Enforcer | null;
  can(action: string, resource: string): Promise<boolean>;
  canAny(actions: string[], resource: string): Promise<boolean>;
  canAll(actions: string[], resource: string): Promise<boolean>;
  addPolicy(policy: string[]): Promise<void>;
  removePolicy(policy: string[]): Promise<void>;
  replacePolicies(policies: string[][]): Promise<void>;
}
```

Notes:

- `sample.config.ts` should be used as the initial default model reference
- the current sample model includes `sub`, `res`, `org`, and `act`, plus `g`, `g2`, and `g3`
- the core API should not erase those concepts just to imitate a simpler two-argument interface
- if needed, provide a simplified wrapper API while preserving access to the underlying enforcer
- the core package should not know or care whether policies came from tRPC, REST, GraphQL, server props, or local memory
- policy mutation methods should not imply backend persistence

Deliverables:

- `casbinjs/core` package
- TypeScript types for policy snapshots and authorizer initialization
- unit tests
- minimal README usage examples
- documented initialization contract for external endpoints

### Phase 2: React package

Deliver a `casbinjs/react` package built on top of `casbinjs/core`.

Scope:

- React context provider
- `useCasbin()` hook
- `useCan()`, `useCanAny()`, and `useCanAll()`
- support updating authorizer state from props
- optional convenience helpers
- preserve compatibility with application-owned fetching logic

Example target usage:

```tsx
<CasbinProvider authorizer={authorizer}>
  <App />
</CasbinProvider>
```

```tsx
const { can, canAny, canAll, addPolicy, removePolicy, replacePolicies, getEnforcer } =
  useCasbin();
```

Non-goals for this package:

- embedding tRPC, React Query, SWR, or any fetching mechanism directly into the library
- duplicating `casbinjs/core` logic inside React bindings

Deliverables:

- `casbinjs/react` package
- React tests
- examples for common usage patterns
- examples showing integration with consumer-owned fetching logic

### Phase 3: Solid package

Deliver a `casbinjs/solid` package with equivalent concepts for SolidJS.

Scope:

- context-based access to an authorizer
- reactive wrappers where useful
- API shape as close as practical to the React package
- same transport-agnostic assumptions as the React package

Deliverables:

- `casbinjs/solid` package
- tests
- example usage

### Phase 4: Adapters and advanced model support

Once the core API is stable, extend support for broader Casbin usage.

Scope:

- adapters package or packages
- policy loading and persistence helpers
- examples for file-backed or database-backed policy storage
- fuller support for model-driven features such as:
  - `keyMatch`
  - `g`, `g2`, `g3`
  - organization-aware checks
  - public subject handling
- richer policy snapshot formats for advanced hydration
- evaluate whether worker-backed authorizers deserve a dedicated package or runtime mode

Deliverables:

- adapter abstractions
- adapter examples
- documentation for advanced model scenarios

### Phase 5: Documentation, compatibility, and release polish

Scope:

- improve package READMEs
- add migration notes for users familiar with `casbin-js`
- document the expected policy snapshot contract clearly
- document synchronization responsibilities clearly
- document package boundaries clearly
- benchmark basic authorization checks
- confirm compatibility with:
  - Node.js
  - modern browsers
  - Bun
  - Deno, if practical
  - SSR frameworks

Deliverables:

- polished docs
- release workflow
- versioning policy
- examples repository or examples directory

## Open Questions

1. Package naming and publishing
   - Can packages literally be published as `casbinjs/core`, `casbinjs/react`, etc.?
   - If not, should the published names be `@casbinjs/core` and friends while docs present them as `casbinjs/core` conceptually?

2. API surface
   - Should `can(...)` accept only `(action, resource)` for ergonomics?
   - Or should it support richer request shapes like:
     ```ts
     can({ subject, resource, organization, action })
     ```
   - A richer request object may align better with the provided Casbin model.

3. Sync vs async
   - Should the public API be synchronous by default?
   - Or should it expose async checks to better match enforcer behavior in all environments?
   - If worker-backed execution is introduced later, should that be a separate async interface?

4. React API shape
   - Should `casbinjs/react` primarily accept a ready-made `authorizer` instance?
   - Or should it also accept raw policy snapshots and build the authorizer internally?

5. Framework packaging
   - Should `react` and `solid` live in the same monorepo from the start?
   - Current recommendation: yes, but keep them optional and thin.

## Immediate Next Steps

1. Finalize package naming strategy
   - Prefer `casbinjs/core`, `casbinjs/react`, `casbinjs/solid`
   - Fall back to scoped names if required by npm conventions

2. Define the first stable external endpoint contract
   - start with policy snapshots
   - ensure it is framework-agnostic and transport-agnostic
   - document how applications map endpoint responses into authorizer initialization

3. Inspect `casbin-core` v1.0.0 API in detail
   - confirm enforcer construction
   - confirm sync/async behavior
   - confirm support for the sample model features

4. Define the first stable `Authorizer` facade interface
   - decide class vs factory
   - decide request signature
   - decide how policy snapshots feed initialization
   - define the semantics of local policy mutation methods

5. Build the first `casbinjs/core` prototype
   - use `sample.config.ts` as the baseline model
   - write tests for exact match, wildcard, org-scoped checks, grouped actions, and policy mutation flows

6. Add `casbinjs/react`
   - keep it thin
   - avoid embedding policy logic in the React package
   - avoid embedding data-fetching logic in the React package
   - expose provider and hook patterns aligned with the current spec

## Suggested Initial Success Criteria

The first milestone is successful if:

- a consumer can install `casbinjs/core`
- initialize an authorizer from a documented policy snapshot shape
- construct an authorizer with a model and policies when needed
- call `can`, `canAny`, and `canAll`
- mutate local policy state in memory
- access the underlying enforcer when needed
- use the same core package from a React app through `casbinjs/react`
- integrate with tRPC, REST, or any other fetching approach without library changes

## Notes on the Provided Sample Model

The sample model is:

```ts
export const DEFAULT_PERMISSION_MODEL = `
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
m = (p.sub == 'public' || r.sub == p.sub) && \
    (r.org == p.org) && \
    (r.res == p.res || keyMatch(r.res, p.res) || g2(r.res, p.res, r.org)) && \
    (r.act == p.act || g3(r.act, p.act))
`.trim();
```

Implications:

- authorization is not purely action/resource based
- subject and organization are first-class concerns
- grouped resources and grouped actions matter
- wildcard and resource pattern support should ideally come from the model, not custom ad hoc logic

For that reason, the roadmap should favor a core API that can support both:

- a simple ergonomic wrapper for common UI checks
- full Casbin request semantics when needed

The React consumer example also reinforces that:

- consumers want provider and hook ergonomics
- applications want to own data fetching
- the library should define what authorization data it expects, not how that data is fetched
- React bindings should remain a thin integration layer over the core authorizer facade
