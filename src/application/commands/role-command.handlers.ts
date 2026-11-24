import { ApplicationError } from '../errors/application-error';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserDirectoryPort } from '../ports/user-directory.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import { AuthorizationGuard } from '../security/authorization.guard';
import { requireRole } from '../require-role';
import { toRoleView, toUserRoleView, type RoleView } from '../role-view';
import type { Role } from '../../domain/models/role';
import { ADMIN_ROLE_KEY } from '../../domain/catalog/default-roles';
import {
  assertNotLastAdmin,
  effectiveRoleKey,
} from '../../domain/policies/access.policy';
import {
  assertRoleMutable,
  assertValidPermissionKeys,
  validateCreateRole,
  validateRolePatch,
} from '../../domain/policies/role.policy';
import {
  AddRolePermissionsCommand,
  AssignUserRoleCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  RemoveRolePermissionsCommand,
  UpdateRoleCommand,
} from './role.commands';

/** Re-reads the count so write responses match what the list endpoint shows. */
async function view(
  role: Role,
  userRoles: UserRoleRepositoryPort,
): Promise<RoleView> {
  return toRoleView(role, await userRoles.countByRole(role.key));
}

function notFound(): never {
  throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
}

export class CreateRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: CreateRoleCommand) {
    await this.guard.require(actor, 'roles:write');
    const valid = validateCreateRole(input);
    const role = await this.roles.insert({ ...valid, kind: 'custom' });
    return view(role, this.userRoles);
  }
}

export class UpdateRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: UpdateRoleCommand) {
    await this.guard.require(actor, 'roles:write');
    const role = await requireRole(this.roles, input.key);
    assertRoleMutable(role, 'update');
    const updated = await this.roles.update(
      role.key,
      validateRolePatch(input.patch),
    );
    return view(updated ?? notFound(), this.userRoles);
  }
}

export class DeleteRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: DeleteRoleCommand) {
    await this.guard.require(actor, 'roles:write');
    const role = await requireRole(this.roles, input.key);
    assertRoleMutable(role, 'delete');
    if ((await this.userRoles.countByRole(role.key)) > 0)
      throw new ApplicationError('ROLE_IN_USE', 'Role is assigned to users');
    await this.roles.delete(role.key);
    // Gateway answers 204 with no body.
  }
}

export class AddRolePermissionsHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: AddRolePermissionsCommand) {
    await this.guard.require(actor, 'roles:write');
    const role = await requireRole(this.roles, input.key);
    assertRoleMutable(role, 'editPermissions');
    const keys = assertValidPermissionKeys(input.permissionKeys);
    const updated = await this.roles.addPermissions(role.key, keys);
    return view(updated ?? notFound(), this.userRoles);
  }
}

export class RemoveRolePermissionsHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: RemoveRolePermissionsCommand) {
    await this.guard.require(actor, 'roles:write');
    const role = await requireRole(this.roles, input.key);
    assertRoleMutable(role, 'editPermissions');
    const keys = assertValidPermissionKeys(input.permissionKeys);
    const updated = await this.roles.removePermissions(role.key, keys);
    return view(updated ?? notFound(), this.userRoles);
  }
}

export class AssignUserRoleHandler {
  constructor(
    private readonly directory: UserDirectoryPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: AssignUserRoleCommand) {
    const caller = await this.guard.require(actor, 'roles:assign');
    const role = await requireRole(this.roles, input.roleKey);
    const account = await this.directory.find(input.userId);
    if (!account)
      throw new ApplicationError('USER_NOT_FOUND', 'User not found');
    const current = await this.userRoles.findByUserId(account.userId);
    assertNotLastAdmin(
      effectiveRoleKey(current),
      role.key,
      await this.userRoles.countByRole(ADMIN_ROLE_KEY),
    );
    await this.userRoles.assign(account.userId, role.key, caller.userId);
    return toUserRoleView(account.userId, role);
  }
}
