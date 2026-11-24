import {
  assertNotLastAdmin,
  effectiveRoleKey,
  resolveEffectiveAccess,
} from './access.policy';

const catalog = ['users:read', 'roles:read', 'roles:write'];

describe('effectiveRoleKey', () => {
  it('defaults to member without an assignment', () => {
    expect(effectiveRoleKey(null)).toBe('member');
  });
  it('uses the assignment', () => {
    expect(
      effectiveRoleKey({
        userId: 'u',
        roleKey: 'qa',
        assignedBy: 'a',
        assignedAt: '',
      }),
    ).toBe('qa');
  });
});

describe('resolveEffectiveAccess', () => {
  it('gives admin the whole catalog, sorted, ignoring stored keys', () => {
    expect(
      resolveEffectiveAccess(
        'u1',
        { key: 'admin', name: 'Admin', permissionKeys: [] },
        catalog,
      ),
    ).toEqual({
      userId: 'u1',
      role: { key: 'admin', name: 'Admin' },
      permissions: ['roles:read', 'roles:write', 'users:read'],
    });
  });
  it('uses the role list for other roles, de-duplicated and sorted', () => {
    expect(
      resolveEffectiveAccess(
        'u2',
        {
          key: 'qa',
          name: 'QA',
          permissionKeys: ['users:read', 'roles:read', 'users:read'],
        },
        catalog,
      ).permissions,
    ).toEqual(['roles:read', 'users:read']);
  });
});

describe('assertNotLastAdmin', () => {
  it('blocks demoting the only admin', () => {
    expect(() => assertNotLastAdmin('admin', 'member', 1)).toThrow(
      expect.objectContaining({ code: 'LAST_ADMIN_PROTECTED' }),
    );
  });
  it('allows demotion when another admin remains', () => {
    expect(() => assertNotLastAdmin('admin', 'member', 2)).not.toThrow();
  });
  it('allows re-assigning admin and promoting non-admins', () => {
    expect(() => assertNotLastAdmin('admin', 'admin', 1)).not.toThrow();
    expect(() => assertNotLastAdmin('member', 'admin', 0)).not.toThrow();
  });
});
