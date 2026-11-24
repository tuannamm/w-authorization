import {
  GetMyAccessHandler,
  GetUserAccessHandler,
  ResolveAccessHandler,
} from './queries/access-query.handlers';
import {
  GetMyAccessQuery,
  GetUserAccessQuery,
  ResolveAccessQuery,
} from './queries/access.queries';
import {
  GetPermissionHandler,
  ListPermissionsHandler,
} from './queries/permission-query.handlers';
import {
  GetPermissionQuery,
  ListPermissionsQuery,
} from './queries/permission.queries';
import { ISSUER, makeWorld } from './testing/fakes';

const code = (c: string) => expect.objectContaining({ code: c });

describe('access queries', () => {
  const setup = () => {
    const w = makeWorld();
    return {
      ...w,
      resolve: new ResolveAccessHandler(w.access),
      me: new GetMyAccessHandler(w.access, w.guard),
      user: new GetUserAccessHandler(w.access, w.guard),
    };
  };

  it('resolve: admin gets every catalog permission', async () => {
    const s = setup();
    const result = await s.resolve.execute(new ResolveAccessQuery('root'));
    expect(result.role).toEqual({ key: 'admin', name: 'Admin' });
    expect(Object.keys(result).sort()).toEqual([
      'permissions',
      'role',
      'userId',
    ]);
    expect(result.permissions).toEqual(
      expect.arrayContaining(['users:read', 'roles:write', 'roles:assign']),
    );
  });

  it('resolve: user without a record is a member with no permissions', async () => {
    const s = setup();
    s.directory.add('bob');
    await expect(
      s.resolve.execute(new ResolveAccessQuery('bob')),
    ).resolves.toEqual({
      userId: 'bob',
      role: { key: 'member', name: 'Member' },
      permissions: [],
    });
  });

  it('resolve: a locked account has no permissions but keeps its role', async () => {
    const s = setup();
    s.directory.add('root', false);
    await expect(
      s.resolve.execute(new ResolveAccessQuery('root')),
    ).resolves.toEqual({
      userId: 'root',
      role: { key: 'admin', name: 'Admin' },
      permissions: [],
    });
  });

  it('resolve: an unknown account fails closed instead of erroring', async () => {
    const s = setup();
    await expect(
      s.resolve.execute(new ResolveAccessQuery('ghost')),
    ).resolves.toEqual({
      userId: 'ghost',
      role: null,
      permissions: [],
    });
  });

  it('me.access needs only a trusted identity', async () => {
    const s = setup();
    s.directory.add('bob');
    await expect(
      s.me.execute(new GetMyAccessQuery({ userId: 'bob', issuer: ISSUER })),
    ).resolves.toMatchObject({
      role: { key: 'member', name: 'Member' },
      permissions: [],
    });
    await expect(s.me.execute(new GetMyAccessQuery())).rejects.toThrow(
      code('UNAUTHENTICATED'),
    );
  });

  it('users.getAccess 404s for unknown users and needs roles:read', async () => {
    const s = setup();
    await expect(
      s.user.execute(new GetUserAccessQuery({ userId: 'ghost' }, s.root)),
    ).rejects.toThrow(code('USER_NOT_FOUND'));
    s.directory.add('bob');
    await expect(
      s.user.execute(
        new GetUserAccessQuery(
          { userId: 'root' },
          { userId: 'bob', issuer: ISSUER },
        ),
      ),
    ).rejects.toThrow(code('FORBIDDEN'));
  });

  it('every access path returns exactly { userId, role: { key, name }, permissions }', async () => {
    const s = setup();
    s.directory.add('bob');
    const expected = {
      userId: 'bob',
      role: { key: 'member', name: 'Member' },
      permissions: [],
    };
    await expect(
      s.resolve.execute(new ResolveAccessQuery('bob')),
    ).resolves.toEqual(expected);
    await expect(
      s.me.execute(new GetMyAccessQuery({ userId: 'bob', issuer: ISSUER })),
    ).resolves.toEqual(expected);
    await expect(
      s.user.execute(new GetUserAccessQuery({ userId: 'bob' }, s.root)),
    ).resolves.toEqual(expected);
  });

  it('a changed role changes access (no stale copy)', async () => {
    const s = setup();
    s.directory.add('bob');
    await s.userRoles.assign('bob', 'senior-manager', 'root');
    const { permissions } = await s.resolve.execute(
      new ResolveAccessQuery('bob'),
    );
    expect(permissions).toEqual([
      'permissions:read',
      'roles:read',
      'users:read',
    ]);
  });
});

describe('permission queries', () => {
  it('lists the catalog and 404s on unknown keys', async () => {
    const w = makeWorld();
    const list = new ListPermissionsHandler(w.permissions, w.guard);
    const get = new GetPermissionHandler(w.permissions, w.guard);
    expect(
      (await list.execute(new ListPermissionsQuery(w.root))).items.length,
    ).toBeGreaterThan(0);
    await expect(
      get.execute(new GetPermissionQuery({ key: 'users:read' }, w.root)),
    ).resolves.toMatchObject({ key: 'users:read' });
    await expect(
      get.execute(new GetPermissionQuery({ key: 'tasks:read' }, w.root)),
    ).rejects.toThrow(code('PERMISSION_NOT_FOUND'));
    await expect(
      get.execute(new GetPermissionQuery({ key: 'BAD' }, w.root)),
    ).rejects.toThrow(code('INVALID_PERMISSION'));
  });
  it('requires permissions:read', async () => {
    const w = makeWorld();
    w.directory.add('bob');
    await expect(
      new ListPermissionsHandler(w.permissions, w.guard).execute(
        new ListPermissionsQuery({ userId: 'bob', issuer: ISSUER }),
      ),
    ).rejects.toThrow(code('FORBIDDEN'));
  });
});
