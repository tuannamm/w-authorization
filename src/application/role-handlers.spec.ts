import {
  AddRolePermissionsHandler,
  AssignUserRoleHandler,
  CreateRoleHandler,
  DeleteRoleHandler,
  RemoveRolePermissionsHandler,
  UpdateRoleHandler,
} from './commands/role-command.handlers';
import {
  AddRolePermissionsCommand,
  AssignUserRoleCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  RemoveRolePermissionsCommand,
  UpdateRoleCommand,
} from './commands/role.commands';
import {
  GetRoleHandler,
  GetUserRoleHandler,
  ListRolesHandler,
  ListRoleUsersHandler,
} from './queries/role-query.handlers';
import {
  GetRoleQuery,
  GetUserRoleQuery,
  ListRolesQuery,
  ListRoleUsersQuery,
} from './queries/role.queries';
import { ISSUER, makeWorld } from './testing/fakes';

const code = (c: string) => expect.objectContaining({ code: c });

describe('role commands', () => {
  const setup = () => {
    const w = makeWorld();
    return {
      ...w,
      create: new CreateRoleHandler(w.roles, w.userRoles, w.guard),
      update: new UpdateRoleHandler(w.roles, w.userRoles, w.guard),
      remove: new DeleteRoleHandler(w.roles, w.userRoles, w.guard),
      add: new AddRolePermissionsHandler(w.roles, w.userRoles, w.guard),
      drop: new RemoveRolePermissionsHandler(w.roles, w.userRoles, w.guard),
      assign: new AssignUserRoleHandler(
        w.directory,
        w.roles,
        w.userRoles,
        w.guard,
      ),
    };
  };

  it('creates a custom role with userCount 0', async () => {
    const s = setup();
    const role = await s.create.execute(
      new CreateRoleCommand(
        { key: 'qa-lead', name: 'QA Lead', permissionKeys: ['users:read'] },
        s.root,
      ),
    );
    expect(role).toMatchObject({
      key: 'qa-lead',
      kind: 'custom',
      permissionKeys: ['users:read'],
      userCount: 0,
    });
  });

  it('rejects a duplicate key with ROLE_CONFLICT', async () => {
    const s = setup();
    await expect(
      s.create.execute(
        new CreateRoleCommand({ key: 'member', name: 'X' }, s.root),
      ),
    ).rejects.toThrow(code('ROLE_CONFLICT'));
  });

  it('rejects permissions outside the catalog', async () => {
    const s = setup();
    await expect(
      s.create.execute(
        new CreateRoleCommand(
          { key: 'qa', name: 'QA', permissionKeys: ['x:y'] },
          s.root,
        ),
      ),
    ).rejects.toThrow(code('INVALID_PERMISSION'));
  });

  describe('permission checks (defence in depth)', () => {
    it('rejects an unauthenticated actor', async () => {
      const s = setup();
      await expect(
        s.create.execute(new CreateRoleCommand({ key: 'qa', name: 'QA' })),
      ).rejects.toThrow(code('UNAUTHENTICATED'));
      await expect(
        s.create.execute(
          new CreateRoleCommand(
            { key: 'qa', name: 'QA' },
            { userId: 'root', issuer: 'evil' },
          ),
        ),
      ).rejects.toThrow(code('UNAUTHENTICATED'));
    });
    it('rejects an actor without roles:write', async () => {
      const s = setup();
      s.directory.add('bob'); // no assignment => member => no permissions
      await expect(
        s.create.execute(
          new CreateRoleCommand(
            { key: 'qa', name: 'QA' },
            { userId: 'bob', issuer: ISSUER },
          ),
        ),
      ).rejects.toThrow(code('FORBIDDEN'));
    });
  });

  describe('update', () => {
    it('renames a default role', async () => {
      const s = setup();
      const role = await s.update.execute(
        new UpdateRoleCommand(
          { key: 'member', patch: { name: 'Staff' } },
          s.root,
        ),
      );
      expect(role.name).toBe('Staff');
      expect(role.key).toBe('member');
    });
    it('clears the description with an empty string, keeping the name', async () => {
      const s = setup();
      await s.update.execute(
        new UpdateRoleCommand(
          { key: 'member', patch: { description: 'temp' } },
          s.root,
        ),
      );
      const role = await s.update.execute(
        new UpdateRoleCommand(
          { key: 'member', patch: { description: '' } },
          s.root,
        ),
      );
      expect(role.description).toBeUndefined();
      expect(role.name).toBe('Member');
    });
    it('still requires a non-blank name', async () => {
      const s = setup();
      await expect(
        s.update.execute(
          new UpdateRoleCommand(
            { key: 'member', patch: { name: ' ' } },
            s.root,
          ),
        ),
      ).rejects.toThrow(code('INVALID_ROLE'));
    });
    it('blocks the system role', async () => {
      const s = setup();
      await expect(
        s.update.execute(
          new UpdateRoleCommand({ key: 'admin', patch: { name: 'x' } }, s.root),
        ),
      ).rejects.toThrow(code('SYSTEM_ROLE_PROTECTED'));
    });
    it('404s on an unknown role', async () => {
      const s = setup();
      await expect(
        s.update.execute(
          new UpdateRoleCommand({ key: 'ghost', patch: { name: 'x' } }, s.root),
        ),
      ).rejects.toThrow(code('ROLE_NOT_FOUND'));
    });
  });

  describe('delete', () => {
    it('deletes an unused custom role', async () => {
      const s = setup();
      await s.create.execute(
        new CreateRoleCommand({ key: 'qa', name: 'QA' }, s.root),
      );
      await s.remove.execute(new DeleteRoleCommand({ key: 'qa' }, s.root));
      expect(await s.roles.findByKey('qa')).toBeNull();
    });
    it('refuses a role that still has users (ROLE_IN_USE)', async () => {
      const s = setup();
      await s.create.execute(
        new CreateRoleCommand({ key: 'qa', name: 'QA' }, s.root),
      );
      s.directory.add('bob');
      await s.assign.execute(
        new AssignUserRoleCommand({ userId: 'bob', roleKey: 'qa' }, s.root),
      );
      await expect(
        s.remove.execute(new DeleteRoleCommand({ key: 'qa' }, s.root)),
      ).rejects.toThrow(code('ROLE_IN_USE'));
    });
    it('protects default and system roles', async () => {
      const s = setup();
      await expect(
        s.remove.execute(new DeleteRoleCommand({ key: 'member' }, s.root)),
      ).rejects.toThrow(code('DEFAULT_ROLE_PROTECTED'));
      await expect(
        s.remove.execute(new DeleteRoleCommand({ key: 'admin' }, s.root)),
      ).rejects.toThrow(code('SYSTEM_ROLE_PROTECTED'));
    });
  });

  describe('add / remove permissions', () => {
    it('is idempotent and works on default roles', async () => {
      const s = setup();
      const cmd = () =>
        new AddRolePermissionsCommand(
          { key: 'member', permissionKeys: ['users:read', 'users:read'] },
          s.root,
        );
      await s.add.execute(cmd());
      const role = await s.add.execute(cmd());
      expect(role.permissionKeys).toEqual(['users:read']);
      const removed = await s.drop.execute(
        new RemoveRolePermissionsCommand(
          { key: 'member', permissionKeys: ['users:read', 'roles:read'] },
          s.root,
        ),
      );
      expect(removed.permissionKeys).toEqual([]);
    });
    it('blocks admin and unknown permissions', async () => {
      const s = setup();
      await expect(
        s.add.execute(
          new AddRolePermissionsCommand(
            { key: 'admin', permissionKeys: ['users:read'] },
            s.root,
          ),
        ),
      ).rejects.toThrow(code('SYSTEM_ROLE_PROTECTED'));
      await expect(
        s.add.execute(
          new AddRolePermissionsCommand(
            { key: 'member', permissionKeys: ['tasks:read'] },
            s.root,
          ),
        ),
      ).rejects.toThrow(code('INVALID_PERMISSION'));
    });
  });

  describe('assign role', () => {
    it('assigns and records the actor', async () => {
      const s = setup();
      s.directory.add('bob');
      const result = await s.assign.execute(
        new AssignUserRoleCommand(
          { userId: 'bob', roleKey: 'senior-manager' },
          s.root,
        ),
      );
      expect(result).toEqual({
        userId: 'bob',
        role: { key: 'senior-manager', name: 'Senior Manager' },
      });
      expect((await s.userRoles.findByUserId('bob'))?.assignedBy).toBe('root');
    });
    it('requires an existing Keycloak user', async () => {
      const s = setup();
      await expect(
        s.assign.execute(
          new AssignUserRoleCommand(
            { userId: 'ghost', roleKey: 'member' },
            s.root,
          ),
        ),
      ).rejects.toThrow(code('USER_NOT_FOUND'));
    });
    it('requires an existing role', async () => {
      const s = setup();
      s.directory.add('bob');
      await expect(
        s.assign.execute(
          new AssignUserRoleCommand(
            { userId: 'bob', roleKey: 'ghost' },
            s.root,
          ),
        ),
      ).rejects.toThrow(code('ROLE_NOT_FOUND'));
    });
    it('needs roles:assign', async () => {
      const s = setup();
      s.directory.add('bob');
      await s.userRoles.assign('bob', 'senior-manager', 'root'); // read-only perms
      await expect(
        s.assign.execute(
          new AssignUserRoleCommand(
            { userId: 'bob', roleKey: 'admin' },
            { userId: 'bob', issuer: ISSUER },
          ),
        ),
      ).rejects.toThrow(code('FORBIDDEN'));
    });
    it('protects the last admin but allows demotion with another admin', async () => {
      const s = setup();
      const demote = () =>
        s.assign.execute(
          new AssignUserRoleCommand(
            { userId: 'root', roleKey: 'member' },
            s.root,
          ),
        );
      await expect(demote()).rejects.toThrow(code('LAST_ADMIN_PROTECTED'));
      s.directory.add('second');
      await s.assign.execute(
        new AssignUserRoleCommand(
          { userId: 'second', roleKey: 'admin' },
          s.root,
        ),
      );
      await expect(demote()).resolves.toEqual({
        userId: 'root',
        role: { key: 'member', name: 'Member' },
      });
    });
    it('is idempotent when re-assigning the same role', async () => {
      const s = setup();
      const again = () =>
        s.assign.execute(
          new AssignUserRoleCommand(
            { userId: 'root', roleKey: 'admin' },
            s.root,
          ),
        );
      await again();
      await expect(again()).resolves.toEqual({
        userId: 'root',
        role: { key: 'admin', name: 'Admin' },
      });
    });
  });
});

describe('role queries', () => {
  const setup = () => {
    const w = makeWorld();
    return {
      ...w,
      list: new ListRolesHandler(w.roles, w.userRoles, w.guard),
      get: new GetRoleHandler(w.roles, w.userRoles, w.guard),
      users: new ListRoleUsersHandler(w.roles, w.userRoles, w.guard),
      userRole: new GetUserRoleHandler(
        w.directory,
        w.roles,
        w.userRoles,
        w.guard,
      ),
    };
  };

  it('lists roles with userCount; implicit members are not counted', async () => {
    const s = setup();
    s.directory.add('bob'); // no record => implicit member
    const { items } = await s.list.execute(new ListRolesQuery(s.root));
    const count = (k: string) => items.find((r) => r.key === k)?.userCount;
    expect(count('admin')).toBe(1);
    expect(count('member')).toBe(0);
  });

  it('returns the Role contract shape (list wraps in { items })', async () => {
    const s = setup();
    const { items } = await s.list.execute(new ListRolesQuery(s.root));
    const member = items.find((r) => r.key === 'member');
    expect(Object.keys(member ?? {}).sort()).toEqual(
      [
        'createdAt',
        'description',
        'key',
        'kind',
        'name',
        'permissionKeys',
        'updatedAt',
        'userCount',
      ].sort(),
    );
    expect(
      Object.keys(await s.list.execute(new ListRolesQuery(s.root))),
    ).toEqual(['items']);
  });

  it('shows admin with the whole catalog, computed', async () => {
    const s = setup();
    const admin = await s.get.execute(
      new GetRoleQuery({ key: 'admin' }, s.root),
    );
    expect(admin.permissionKeys).toContain('roles:assign');
    expect(s.roles.roles.get('admin')?.permissionKeys).toEqual([]);
  });

  it('paginates role users', async () => {
    const s = setup();
    for (const id of ['a', 'b', 'c'])
      await s.userRoles.assign(id, 'member', 'root');
    const page = await s.users.execute(
      new ListRoleUsersQuery({ key: 'member', page: 2, limit: 2 }, s.root),
    );
    expect(page).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(page.items.map((i) => i.userId)).toEqual(['c']);
    expect(page.items[0]).toEqual({
      userId: 'c',
      assignedAt: expect.any(String),
      assignedBy: 'root',
    });
  });

  it('defaults a user without a record to member', async () => {
    const s = setup();
    s.directory.add('bob');
    await expect(
      s.userRole.execute(new GetUserRoleQuery({ userId: 'bob' }, s.root)),
    ).resolves.toEqual({
      userId: 'bob',
      role: { key: 'member', name: 'Member' },
    });
    await expect(
      s.userRole.execute(new GetUserRoleQuery({ userId: 'ghost' }, s.root)),
    ).rejects.toThrow(code('USER_NOT_FOUND'));
  });

  it('requires roles:read', async () => {
    const s = setup();
    s.directory.add('bob');
    await expect(
      s.list.execute(new ListRolesQuery({ userId: 'bob', issuer: ISSUER })),
    ).rejects.toThrow(code('FORBIDDEN'));
  });
});
