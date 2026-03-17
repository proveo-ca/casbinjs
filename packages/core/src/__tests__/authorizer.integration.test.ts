import { describe, expect, it } from 'vitest';
import { createAuthorizer } from '../index';
import { MODEL_FIXTURE } from './fixtures/model';

describe('@casbinjs/core integration', () => {
  it('initializes an authorizer and exposes a ready enforcer', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
    });

    expect(authorizer.getEnforcer()).not.toBeNull();
  });

  it('denies ungranted permissions', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
    await expect(authorizer.canAny(['read', 'write'], 'document:1')).resolves.toBe(false);
    await expect(authorizer.canAll(['read', 'write'], 'document:1')).resolves.toBe(false);
  });

  it('supports local permission mutation flow', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);

    await authorizer.addPermission({
      action: 'read',
      resource: 'document:1',
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);

    await authorizer.removePermission({
      action: 'read',
      resource: 'document:1',
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
  });

  it('replaces permissions with setPermissions', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [
        {
          action: 'read',
          resource: 'document:1',
        },
      ],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(false);

    await authorizer.setPermissions([
      {
        action: 'write',
        resource: 'document:1',
      },
    ]);

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(true);
  });

  it('replaces payload state with replacePayload', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [
        {
          action: 'read',
          resource: 'document:1',
        },
      ],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(false);

    await authorizer.replacePayload({
      roles: [],
      permissions: [
        {
          action: 'write',
          resource: 'document:1',
        },
      ],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(true);
  });

  it('supports canAny and canAll across mixed granted actions', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [
        {
          action: 'read',
          resource: 'document:1',
        },
      ],
    });

    await expect(authorizer.canAny(['read', 'write'], 'document:1')).resolves.toBe(true);
    await expect(authorizer.canAll(['read', 'write'], 'document:1')).resolves.toBe(false);
  });

  it('supports public subject policies from raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
      policies: [['p', 'public', 'document:public', 'org-1', 'read', 'allow']],
    });

    await expect(authorizer.can('read', 'document:public')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:public')).resolves.toBe(false);
  });

  it('supports g role inheritance from raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
      policies: [
        ['p', 'role:editor', 'document:role', 'org-1', 'read', 'allow'],
        ['g', 'alice', 'role:editor', 'org-1'],
      ],
    });

    await expect(authorizer.can('read', 'document:role')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:role')).resolves.toBe(false);
  });

  it('supports g2 resource grouping from raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
      policies: [
        ['p', 'alice', 'folder:reports', 'org-1', 'read', 'allow'],
        ['g2', 'document:q1', 'folder:reports', 'org-1'],
      ],
    });

    await expect(authorizer.can('read', 'document:q1')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:q1')).resolves.toBe(false);
  });

  it('supports g3 action grouping from raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
      policies: [
        ['p', 'alice', 'document:manage', 'org-1', 'manage', 'allow'],
        ['g3', 'read', 'manage'],
      ],
    });

    await expect(authorizer.can('read', 'document:manage')).resolves.toBe(true);
    await expect(authorizer.can('manage', 'document:manage')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:manage')).resolves.toBe(false);
  });

  it('supports combined g, g2, and g3 raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      permissions: [],
      policies: [
        ['p', 'role:manager', 'collection:reports', 'org-1', 'manage', 'allow'],
        ['g', 'alice', 'role:manager', 'org-1'],
        ['g2', 'document:q2', 'collection:reports', 'org-1'],
        ['g3', 'read', 'manage'],
      ],
    });

    await expect(authorizer.can('read', 'document:q2')).resolves.toBe(true);
    await expect(authorizer.can('manage', 'document:q2')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:q2')).resolves.toBe(false);
  });
});
