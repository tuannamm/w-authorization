import {
  assertRoleMutable,
  assertValidPermissionKeys,
  assertValidRoleKey,
  validateCreateRole,
  validateRolePatch,
} from './role.policy';

const catalog = ['users:read', 'roles:read'];

describe('assertValidRoleKey', () => {
  it.each(['admin', 'qa-lead', 'a1'])('accepts %s', (key) => {
    expect(() => assertValidRoleKey(key)).not.toThrow();
  });
  it.each(['A', 'x', '1abc', 'has space', 'under_score', '', 42, undefined])(
    'rejects %p',
    (key) => {
      expect(() => assertValidRoleKey(key)).toThrow(
        expect.objectContaining({ code: 'INVALID_ROLE' }),
      );
    },
  );
});

describe('assertValidPermissionKeys', () => {
  it('de-duplicates and keeps order', () => {
    expect(
      assertValidPermissionKeys(
        ['roles:read', 'users:read', 'roles:read'],
        catalog,
      ),
    ).toEqual(['roles:read', 'users:read']);
  });
  it.each([['not-a-key'], ['Users:read'], [42]])(
    'rejects malformed %p',
    (k) => {
      expect(() => assertValidPermissionKeys(k, catalog)).toThrow(
        expect.objectContaining({ code: 'INVALID_PERMISSION' }),
      );
    },
  );
  it('rejects keys outside the catalog', () => {
    expect(() => assertValidPermissionKeys(['tasks:read'], catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_PERMISSION' }),
    );
  });
  it('rejects non-arrays', () => {
    expect(() => assertValidPermissionKeys('users:read', catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_PERMISSION' }),
    );
  });
});

describe('validateCreateRole', () => {
  it('normalises a valid role', () => {
    expect(
      validateCreateRole(
        { key: 'qa-lead', name: ' QA Lead ', permissionKeys: ['users:read'] },
        catalog,
      ),
    ).toEqual({
      key: 'qa-lead',
      name: 'QA Lead',
      permissionKeys: ['users:read'],
    });
  });
  it('reserves the admin key', () => {
    expect(() =>
      validateCreateRole({ key: 'admin', name: 'X' }, catalog),
    ).toThrow(expect.objectContaining({ code: 'SYSTEM_ROLE_PROTECTED' }));
  });
  it('rejects blank name', () => {
    expect(() =>
      validateCreateRole({ key: 'qa', name: '  ' }, catalog),
    ).toThrow(expect.objectContaining({ code: 'INVALID_ROLE' }));
  });
});

describe('validateRolePatch', () => {
  it('accepts name and description', () => {
    expect(validateRolePatch({ name: 'New', description: 'd' })).toEqual({
      name: 'New',
      description: 'd',
    });
  });
  it('rejects empty and unknown patches', () => {
    expect(() => validateRolePatch({})).toThrow(
      expect.objectContaining({ code: 'INVALID_ROLE' }),
    );
    expect(() => validateRolePatch({ key: 'x' } as never)).toThrow(
      expect.objectContaining({ code: 'INVALID_ROLE' }),
    );
  });
});

describe('assertRoleMutable', () => {
  it.each(['update', 'delete', 'editPermissions'] as const)(
    'protects the system role from %s',
    (action) => {
      expect(() => assertRoleMutable({ kind: 'system' }, action)).toThrow(
        expect.objectContaining({ code: 'SYSTEM_ROLE_PROTECTED' }),
      );
    },
  );
  it('lets default roles be edited but not deleted', () => {
    expect(() =>
      assertRoleMutable({ kind: 'default' }, 'update'),
    ).not.toThrow();
    expect(() =>
      assertRoleMutable({ kind: 'default' }, 'editPermissions'),
    ).not.toThrow();
    expect(() => assertRoleMutable({ kind: 'default' }, 'delete')).toThrow(
      expect.objectContaining({ code: 'DEFAULT_ROLE_PROTECTED' }),
    );
  });
  it('lets custom roles do everything', () => {
    for (const action of ['update', 'delete', 'editPermissions'] as const)
      expect(() => assertRoleMutable({ kind: 'custom' }, action)).not.toThrow();
  });
});
