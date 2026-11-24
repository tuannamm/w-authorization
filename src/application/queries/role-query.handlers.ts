import { ApplicationError } from '../errors/application-error';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserDirectoryPort } from '../ports/user-directory.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import { AuthorizationGuard } from '../security/authorization.guard';
import { toRoleView, toUserRoleView } from '../role-view';
import { requireRole } from '../require-role';
import { effectiveRoleKey } from '../../domain/policies/access.policy';
import {
  GetRoleQuery,
  GetUserRoleQuery,
  ListRolesQuery,
  ListRoleUsersQuery,
} from './role.queries';

export class ListRolesHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ actor }: ListRolesQuery) {
    await this.guard.require(actor, 'roles:read');
    const [roles, counts] = await Promise.all([
      this.roles.list(),
      this.userRoles.countsByRole(),
    ]);
    return {
      items: roles.map((role) => toRoleView(role, counts[role.key] ?? 0)),
    };
  }
}

export class GetRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: GetRoleQuery) {
    await this.guard.require(actor, 'roles:read');
    const role = await requireRole(this.roles, input.key);
    return toRoleView(role, await this.userRoles.countByRole(role.key));
  }
}

export class ListRoleUsersHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: ListRoleUsersQuery) {
    await this.guard.require(actor, 'roles:read');
    const role = await requireRole(this.roles, input.key);
    const { items, total } = await this.userRoles.listByRole(
      role.key,
      input.page,
      input.limit,
    );
    return {
      items: items.map(({ userId, assignedAt, assignedBy }) => ({
        userId,
        assignedAt,
        assignedBy,
      })),
      total,
      page: input.page,
      limit: input.limit,
    };
  }
}

export class GetUserRoleHandler {
  constructor(
    private readonly directory: UserDirectoryPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: GetUserRoleQuery) {
    await this.guard.require(actor, 'roles:read');
    if (!(await this.directory.find(input.userId)))
      throw new ApplicationError('USER_NOT_FOUND', 'User not found');
    const assignment = await this.userRoles.findByUserId(input.userId);
    return toUserRoleView(
      input.userId,
      await requireRole(this.roles, effectiveRoleKey(assignment)),
    );
  }
}
