import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from '@jest/globals';

// Needs MongoDB (docker compose `mongodb`) and a fresh build: `npm run build`.
const require = createRequire(import.meta.url);
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
  DatabaseModule,
  getDatabaseConnectionToken,
} = require('@lib-infrastructure/database');
const dist = '../dist/';
const { RoleRepository } = require(
  `${dist}infrastructure/persistence/mongoose/role/role.repository.js`,
);
const { PermissionRepository } = require(
  `${dist}infrastructure/persistence/mongoose/permission/permission.repository.js`,
);
const { UserRoleRepository } = require(
  `${dist}infrastructure/persistence/mongoose/user-role/user-role.repository.js`,
);
const { RbacSeeder } = require(`${dist}bootstrap/rbac.seeder.js`);
const { SEED_ROLES } = require(`${dist}domain/catalog/default-roles.js`);
const { PERMISSION_CATALOG } = require(
  `${dist}domain/catalog/permission-catalog.js`,
);

const URI =
  process.env.AUTHORIZATION_TEST_MONGO_URI ??
  'mongodb://admin:admin123@localhost:27017/?authSource=admin';

async function withDatabase(run) {
  const dbName = `authorization_test_${randomUUID().replaceAll('-', '')}`;
  class TestModule {}
  Module({
    imports: [
      DatabaseModule.forRoot({
        uri: URI,
        dbName,
        serverSelectionTimeoutMS: 2000,
      }),
      DatabaseModule.forFeature([
        RoleRepository,
        PermissionRepository,
        UserRoleRepository,
      ]),
    ],
  })(TestModule);
  const app = await NestFactory.createApplicationContext(TestModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    await run({
      roles: app.get(RoleRepository),
      permissions: app.get(PermissionRepository),
      userRoles: app.get(UserRoleRepository),
    });
  } finally {
    await app.get(getDatabaseConnectionToken()).dropDatabase();
    await app.close();
  }
}

const role = (key, kind = 'custom', permissionKeys = []) => ({
  key,
  name: key,
  kind,
  permissionKeys,
});

test('roles: unique key, conflict mapping, system protection', async () => {
  await withDatabase(async ({ roles }) => {
    await roles.insert(role('qa'));
    await assert.rejects(roles.insert(role('qa')), { code: 'ROLE_CONFLICT' });

    await roles.insertIfMissing(role('admin', 'system'));
    assert.equal(await roles.update('admin', { name: 'x' }), null);
    assert.equal(await roles.addPermissions('admin', ['users:read']), null);
    assert.equal(await roles.removePermissions('admin', ['users:read']), null);
    assert.equal(await roles.delete('admin'), false);

    await roles.insertIfMissing(role('member', 'default'));
    assert.equal(
      await roles.delete('member'),
      false,
      'default roles are not deletable',
    );
    assert.equal(
      (await roles.update('member', { name: 'Staff' })).name,
      'Staff',
    );
    await roles.update('qa', { description: 'about qa' });
    assert.equal((await roles.findByKey('qa')).description, 'about qa');
    const cleared = await roles.update('qa', { description: '' });
    assert.equal(cleared.description, undefined, 'empty description is unset');
    assert.equal(cleared.name, 'qa');
    assert.equal(
      await roles.model.countDocuments({
        key: 'qa',
        description: { $exists: true },
      }),
      0,
    );
    assert.equal((await roles.update('qa', { name: 'QA 2' })).name, 'QA 2');
    assert.equal(await roles.delete('qa'), true);
    assert.equal(await roles.findByKey('qa'), null);
  });
});

test('roles: concurrent $addToSet / $pull stay correct and idempotent', async () => {
  await withDatabase(async ({ roles }) => {
    await roles.insert(role('qa'));
    const keys = ['users:read', 'roles:read', 'roles:write'];
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        roles.addPermissions('qa', [keys[i % 3], keys[(i + 1) % 3]]),
      ),
    );
    assert.deepEqual(
      [...(await roles.findByKey('qa')).permissionKeys].sort(),
      [...keys].sort(),
    );

    await Promise.all(
      Array.from({ length: 10 }, () =>
        roles.removePermissions('qa', ['users:read', 'roles:read']),
      ),
    );
    assert.deepEqual((await roles.findByKey('qa')).permissionKeys, [
      'roles:write',
    ]);
    assert.equal(await roles.removePermissions('ghost', ['users:read']), null);
  });
});

test('roles: concurrent insertIfMissing creates exactly one and never overwrites', async () => {
  await withDatabase(async ({ roles }) => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        roles.insertIfMissing(role('member', 'default', ['users:read'])),
      ),
    );
    assert.equal(results.filter(Boolean).length, 1);
    await roles.removePermissions('member', ['users:read']);
    assert.equal(
      await roles.insertIfMissing(role('member', 'default', ['users:read'])),
      false,
    );
    assert.deepEqual((await roles.findByKey('member')).permissionKeys, []);
  });
});

test('user_roles: unique userId, concurrent upsert, counts and pagination', async () => {
  await withDatabase(async ({ userRoles }) => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        userRoles.assign('u1', i % 2 ? 'qa' : 'admin', 'root'),
      ),
    );
    assert.ok(
      results.every((r) => r.userId === 'u1' && r.assignedBy === 'root'),
    );
    assert.equal(
      (await userRoles.countByRole('qa')) +
        (await userRoles.countByRole('admin')),
      1,
    );

    for (const id of ['a', 'b', 'c'])
      await userRoles.assign(id, 'member', 'root');
    assert.deepEqual(await userRoles.countsByRole(), {
      ...((await userRoles.countByRole('admin')) ? { admin: 1 } : { qa: 1 }),
      member: 3,
    });
    const page2 = await userRoles.listByRole('member', 2, 2);
    assert.equal(page2.total, 3);
    assert.deepEqual(
      page2.items.map((i) => i.userId),
      ['c'],
    );
    assert.match(page2.items[0].assignedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(await userRoles.findByUserId('nobody'), null);
  });
});

test('permissions: sync upserts the catalog and reports removed keys', async () => {
  await withDatabase(async ({ permissions }) => {
    assert.deepEqual(await permissions.sync(PERMISSION_CATALOG), []);
    assert.equal((await permissions.list()).length, PERMISSION_CATALOG.length);
    const smaller = PERMISSION_CATALOG.slice(1);
    assert.deepEqual(await permissions.sync(smaller), [
      PERMISSION_CATALOG[0].key,
    ]);
    assert.equal(await permissions.findByKey(PERMISSION_CATALOG[0].key), null);
    assert.deepEqual(await permissions.sync(smaller), []);
  });
});

test('seeder: concurrent replicas converge; dead catalog keys are pruned from roles', async () => {
  await withDatabase(async ({ roles, permissions, userRoles }) => {
    const seeder = () =>
      new RbacSeeder(permissions, roles, userRoles, 'kc-admin');
    await Promise.all(Array.from({ length: 5 }, () => seeder().seed()));
    assert.deepEqual(
      (await roles.list()).map((r) => r.key),
      SEED_ROLES.map((r) => r.key).sort(),
    );
    assert.equal((await userRoles.findByUserId('kc-admin')).roleKey, 'admin');
    assert.equal((await permissions.list()).length, PERMISSION_CATALOG.length);

    await roles.addPermissions('member', ['users:read', 'legacy:gone']);
    await permissions.sync([
      ...PERMISSION_CATALOG,
      { key: 'legacy:gone', description: 'x' },
    ]);
    await seeder().seed();
    assert.deepEqual((await roles.findByKey('member')).permissionKeys, [
      'users:read',
    ]);
  });
});

test('unavailable storage yields a sanitized error', async () => {
  class OfflineModule {}
  Module({
    imports: [
      DatabaseModule.forRoot({
        uri: 'mongodb://localhost:1/?serverSelectionTimeoutMS=300',
        dbName: 'offline',
        serverSelectionTimeoutMS: 300,
      }),
      DatabaseModule.forFeature([RoleRepository]),
    ],
  })(OfflineModule);
  await assert.rejects(
    NestFactory.createApplicationContext(OfflineModule, {
      logger: false,
      abortOnError: false,
    }),
  );
});
