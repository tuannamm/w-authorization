import { makeWorld } from '../application/testing/fakes';
import { PERMISSION_CATALOG } from '../domain/catalog/permission-catalog';
import { RbacSeeder } from './rbac.seeder';

function seeder(w: ReturnType<typeof makeWorld>, bootstrapAdmin?: string) {
  return new RbacSeeder(w.permissions, w.roles, w.userRoles, bootstrapAdmin);
}

describe('RbacSeeder', () => {
  const empty = () => {
    const w = makeWorld();
    w.roles.roles.clear();
    w.userRoles.assignments.clear();
    w.permissions.stored = [];
    return w;
  };

  it('creates the catalog and the three roles', async () => {
    const w = empty();
    await seeder(w).seed();
    expect(w.permissions.stored).toEqual(PERMISSION_CATALOG);
    expect([...w.roles.roles.keys()].sort()).toEqual([
      'admin',
      'member',
      'senior-manager',
    ]);
    expect(w.roles.roles.get('admin')).toMatchObject({
      kind: 'system',
      permissionKeys: [],
    });
    expect(w.roles.roles.get('member')?.kind).toBe('default');
  });

  it('never overwrites roles an admin already edited', async () => {
    const w = empty();
    await seeder(w).seed();
    await w.roles.addPermissions('member', ['users:read']);
    await w.roles.update('senior-manager', { name: 'Chief' });
    await seeder(w).seed();
    expect(w.roles.roles.get('member')?.permissionKeys).toEqual(['users:read']);
    expect(w.roles.roles.get('senior-manager')?.name).toBe('Chief');
  });

  it('prunes keys that left the catalog from every role', async () => {
    const w = empty();
    await seeder(w).seed();
    w.permissions.stored.push({ key: 'old:thing', description: 'gone' });
    await w.roles.addPermissions('member', ['old:thing', 'users:read']);
    await seeder(w).seed();
    expect(w.permissions.stored.map((p) => p.key)).not.toContain('old:thing');
    expect(w.roles.roles.get('member')?.permissionKeys).toEqual(['users:read']);
  });

  it('promotes BOOTSTRAP_ADMIN_USER_ID once and again after a demotion', async () => {
    const w = empty();
    await seeder(w, ' kc-1 ').seed();
    expect(w.userRoles.assignments.get('kc-1')).toMatchObject({
      roleKey: 'admin',
      assignedBy: 'bootstrap',
    });
    await w.userRoles.assign('kc-1', 'member', 'someone');
    await seeder(w, 'kc-1').seed();
    expect(w.userRoles.assignments.get('kc-1')?.roleKey).toBe('admin');
  });

  it('does not rewrite an existing admin assignment', async () => {
    const w = empty();
    await w.userRoles.assign('kc-1', 'admin', 'root');
    await seeder(w, 'kc-1').seed();
    expect(w.userRoles.assignments.get('kc-1')?.assignedBy).toBe('root');
  });

  it('assigns nobody without the variable', async () => {
    const w = empty();
    await seeder(w, '  ').seed();
    expect(w.userRoles.assignments.size).toBe(0);
  });
});
