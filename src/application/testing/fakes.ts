import { ApplicationError } from '../errors/application-error';
import type {
  NewRole,
  RoleRepositoryPort,
} from '../ports/role-repository.port';
import type {
  UserRolePage,
  UserRoleRepositoryPort,
} from '../ports/user-role-repository.port';
import type {
  DirectoryUser,
  UserDirectoryPort,
} from '../ports/user-directory.port';
import type { PermissionRepositoryPort } from '../ports/permission-repository.port';
import { AccessResolver } from '../security/access-resolver';
import { AuthorizationGuard } from '../security/authorization.guard';
import { SEED_ROLES } from '../../domain/catalog/default-roles';
import { PERMISSION_CATALOG } from '../../domain/catalog/permission-catalog';
import type { Permission } from '../../domain/models/permission';
import type { Role, RolePatch } from '../../domain/models/role';
import type { UserRole } from '../../domain/models/user-role';

export const ISSUER = 'trusted-issuer';
export const NOW = '2026-01-01T00:00:00.000Z';

export class FakeRoles implements RoleRepositoryPort {
  readonly roles = new Map<string, Role>();
  private toRole(input: NewRole): Role {
    return { ...input, createdAt: NOW, updatedAt: NOW };
  }
  async insert(input: NewRole) {
    if (this.roles.has(input.key))
      throw new ApplicationError('ROLE_CONFLICT', 'Role already exists');
    const role = this.toRole(input);
    this.roles.set(role.key, role);
    return role;
  }
  async insertIfMissing(input: NewRole) {
    if (this.roles.has(input.key)) return false;
    this.roles.set(input.key, this.toRole(input));
    return true;
  }
  async findByKey(key: string) {
    return this.roles.get(key) ?? null;
  }
  async list() {
    return [...this.roles.values()].sort((a, b) => a.key.localeCompare(b.key));
  }
  private mutate(key: string, change: (role: Role) => Role) {
    const role = this.roles.get(key);
    if (!role || role.kind === 'system') return null;
    const next = change(role);
    this.roles.set(key, next);
    return next;
  }
  async update(key: string, patch: RolePatch) {
    return this.mutate(key, (role) => {
      const { description, ...rest } = patch;
      const next = { ...role, ...rest };
      if (description === '') delete next.description;
      else if (description !== undefined) next.description = description;
      return next;
    });
  }
  async delete(key: string) {
    const role = this.roles.get(key);
    return role?.kind === 'custom' ? this.roles.delete(key) : false;
  }
  async addPermissions(key: string, keys: string[]) {
    return this.mutate(key, (role) => ({
      ...role,
      permissionKeys: [...new Set([...role.permissionKeys, ...keys])],
    }));
  }
  async removePermissions(key: string, keys: string[]) {
    return this.mutate(key, (role) => ({
      ...role,
      permissionKeys: role.permissionKeys.filter((k) => !keys.includes(k)),
    }));
  }
  async pullPermissionsEverywhere(keys: string[]) {
    for (const [key, role] of this.roles)
      this.roles.set(key, {
        ...role,
        permissionKeys: role.permissionKeys.filter((k) => !keys.includes(k)),
      });
  }
}

export class FakeUserRoles implements UserRoleRepositoryPort {
  readonly assignments = new Map<string, UserRole>();
  async findByUserId(userId: string) {
    return this.assignments.get(userId) ?? null;
  }
  async assign(userId: string, roleKey: string, assignedBy: string) {
    const record = { userId, roleKey, assignedBy, assignedAt: NOW };
    this.assignments.set(userId, record);
    return record;
  }
  async countByRole(roleKey: string) {
    return [...this.assignments.values()].filter((a) => a.roleKey === roleKey)
      .length;
  }
  async countsByRole() {
    const counts: Record<string, number> = {};
    for (const { roleKey } of this.assignments.values())
      counts[roleKey] = (counts[roleKey] ?? 0) + 1;
    return counts;
  }
  async listByRole(
    roleKey: string,
    page: number,
    limit: number,
  ): Promise<UserRolePage> {
    const all = [...this.assignments.values()].filter(
      (a) => a.roleKey === roleKey,
    );
    return {
      items: all.slice((page - 1) * limit, page * limit),
      total: all.length,
    };
  }
}

export class FakeDirectory implements UserDirectoryPort {
  readonly users = new Map<string, DirectoryUser>();
  add(userId: string, enabled = true) {
    this.users.set(userId, { userId, enabled });
  }
  async find(userId: string) {
    return this.users.get(userId) ?? null;
  }
}

export class FakePermissions implements PermissionRepositoryPort {
  stored: Permission[] = [];
  async list() {
    return this.stored;
  }
  async findByKey(key: string) {
    return this.stored.find((p) => p.key === key) ?? null;
  }
  async sync(catalog: readonly Permission[]) {
    const removed = this.stored
      .filter((p) => !catalog.some((c) => c.key === p.key))
      .map((p) => p.key);
    this.stored = [...catalog];
    return removed;
  }
}

/** Seeded world: admin / senior-manager / member roles, `root` is admin. */
export function makeWorld() {
  const roles = new FakeRoles();
  const userRoles = new FakeUserRoles();
  const directory = new FakeDirectory();
  const permissions = new FakePermissions();
  permissions.stored = [...PERMISSION_CATALOG];
  for (const seed of SEED_ROLES)
    roles.roles.set(seed.key, { ...seed, createdAt: NOW, updatedAt: NOW });
  directory.add('root');
  userRoles.assignments.set('root', {
    userId: 'root',
    roleKey: 'admin',
    assignedBy: 'root',
    assignedAt: NOW,
  });
  const access = new AccessResolver(directory, roles, userRoles);
  const guard = new AuthorizationGuard(ISSUER, access);
  const root = { userId: 'root', issuer: ISSUER };
  return { roles, userRoles, directory, permissions, access, guard, root };
}
