import { describe, expect, it } from 'vitest';
import { createAuthorizer } from '../index';
import { MODEL_FIXTURE } from './fixtures/model';

describe('@casbinjs/core integration', () => {
  it('initializes an authorizer from a raw policy snapshot response', async () => {
    const apiResponse = {
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'public', 'document:public', 'org-1', 'read', 'allow']],
    };

    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: apiResponse.subject,
      organization: apiResponse.organization,
      policies: apiResponse.policies,
    });

    expect(authorizer.getEnforcer()).not.toBeNull();
    await expect(authorizer.can('read', 'document:public')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:public')).resolves.toBe(false);
  });

  it('denies ungranted permissions', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
    await expect(authorizer.canAny(['read', 'write'], 'document:1')).resolves.toBe(false);
    await expect(authorizer.canAll(['read', 'write'], 'document:1')).resolves.toBe(false);
  });

  it('adds a permission policy with addPolicy', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [],
    });

    await expect(authorizer.can('delete', 'document:1')).resolves.toBe(false);

    await authorizer.addPolicy(['p', 'alice', 'document:1', 'org-1', 'delete', 'allow']);

    await expect(authorizer.can('delete', 'document:1')).resolves.toBe(true);
  });

  it('removes a permission policy with removePolicy', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:1', 'org-1', 'update', 'allow']],
    });

    await expect(authorizer.can('update', 'document:1')).resolves.toBe(true);

    await authorizer.removePolicy(['p', 'alice', 'document:1', 'org-1', 'update', 'allow']);

    await expect(authorizer.can('update', 'document:1')).resolves.toBe(false);
  });

  it('replaces canonical raw policies with replacePolicies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:1', 'org-1', 'read', 'allow']],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(false);

    await authorizer.replacePolicies([['p', 'alice', 'document:1', 'org-1', 'write', 'allow']]);

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);
    await expect(authorizer.can('write', 'document:1')).resolves.toBe(true);
  });

  it('rolls back a revoked permission when canonical policies are restored', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:1', 'org-1', 'read', 'allow']],
    });

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);

    await authorizer.removePolicy(['p', 'alice', 'document:1', 'org-1', 'read', 'allow']);

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(false);

    await authorizer.replacePolicies([['p', 'alice', 'document:1', 'org-1', 'read', 'allow']]);

    await expect(authorizer.can('read', 'document:1')).resolves.toBe(true);
  });

  it('supports canAny and canAll across mixed granted actions', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
      policies: [['p', 'alice', 'document:1', 'org-1', 'read', 'allow']],
    });

    await expect(authorizer.canAny(['read', 'write'], 'document:1')).resolves.toBe(true);
    await expect(authorizer.canAll(['read', 'write'], 'document:1')).resolves.toBe(false);
  });

  it('supports public subject policies from raw policies', async () => {
    const authorizer = await createAuthorizer({
      model: MODEL_FIXTURE,
      subject: 'alice',
      organization: 'org-1',
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
