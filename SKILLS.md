# SKILLS.md

## Purpose

This file provides compact usage context for agents trying to understand and use this library.

Use it as a quick orientation layer for the public API, package responsibilities, and the most important semantics.

---

## Source of truth

When code files are provided in-chat, prefer the most recently supplied file contents.

Do not assume README, roadmap, or spec text is more current than implementation.
If implementation and docs differ, call it out explicitly.

For using the library, prefer the current exported public API over aspirational roadmap text.

---

## What this library is

This workspace currently centers on:

- `@casbinjs/core`
- `@casbinjs/react`

### `@casbinjs/core`

This is the framework-agnostic authorization layer.

It owns:

- the `Authorizer` contract
- `createAuthorizer(options?)`
- the in-memory policy snapshot
- delegation to `casbin-core`

### `@casbinjs/react`

This is the React integration layer.

It owns:

- `CasbinProvider`
- `useCasbin()`
- `useCan()`
- `useCanAny()`
- `useCanAll()`
- React context wiring around a core authorizer

It should be understood as a thin wrapper over `@casbinjs/core`, not a separate authorization engine.

---

## Most important semantic distinction

This library is policy-first.

There is one in-memory authorization source of truth:

- the current policy snapshot

The main mutation APIs are:

- `addPolicy(policy)`
- `removePolicy(policy)`
- `replacePolicies(policies)`

### Practical rule

- use `addPolicy(...)` and `removePolicy(...)` for local policy mutation
- use `replacePolicies(...)` for canonical replacement from a server/API response

If you are deciding how to reconcile after a backend response, prefer `replacePolicies(...)` with the server-returned policies.

---

## Important files

### Public implementation surface

- `packages/core/src/types.ts`
- `packages/core/src/authorizer.ts`
- `packages/core/src/factory.ts`
- `packages/core/src/index.ts`

- `packages/react/src/provider.tsx`
- `packages/react/src/use-casbin.ts`
- `packages/react/src/types.ts`
- `packages/react/src/index.ts`

### Specs for usage context

Core:
- `_spec/core/data-contracts.puml`
- `_spec/core/components.puml`
- `_spec/core/usage.puml`

React:
- `_spec/react/components.puml`
- `_spec/react/init-sequence.puml`
- `_spec/react/usage.puml`

---

## How to use the specs

The `_spec` directory contains design references and contract diagrams that help explain how to use the library.

### Core specs

- `_spec/core/data-contracts.puml`: public types and policy-first contract
- `_spec/core/components.puml`: package and component boundaries
- `_spec/core/usage.puml`: initialization, delegation, mutation, and reconciliation flows

### React specs

- `_spec/react/components.puml`: React responsibility boundaries
- `_spec/react/init-sequence.puml`: provider initialization paths
- `_spec/react/usage.puml`: hook usage and delegation flow

Use these specs as context for understanding the library’s intended behavior and package boundaries.

---

## Current public API notes

### Core

`createAuthorizer(options?)` returns an initialized `AuthorizerFacade`.

`Authorizer` currently exposes:

- `getEnforcer()`
- `can(action, resource)`
- `canAny(actions, resource)`
- `canAll(actions, resource)`
- `addPolicy(...)`
- `removePolicy(...)`
- `replacePolicies(...)`

### React

`CasbinProvider` accepts either:

- `authorizer`
- or `options`

`useCasbin()` returns:

- `authorizer`
- `isLoading`
- `error`
- `can`
- `canAny`
- `canAll`
- `addPolicy`
- `removePolicy`
- `replacePolicies`
- `getEnforcer`

---

## Usage guidance

### For human-facing docs or examples

Prefer explaining:

1. React usage first
2. then plain core usage

Always keep the following clear:

- React is a thin wrapper over core
- fetching is app-owned
- persistence is app-owned
- policies are the in-memory source of truth

### For agent-consumers

Do not assume the library fetches authorization data for you.

Do not assume mutations automatically persist to a backend.

Do assume:

- the app provides policy snapshots
- the core authorizer owns in-memory policy state
- the React package exposes that authorizer through context and hooks

---

## Terminology

- policy snapshot: raw Casbin-style policies used as in-memory authorization state
- canonical replacement: replacing local state with server/API-consistent policies
- organization: optional scope value passed into Casbin enforcement
