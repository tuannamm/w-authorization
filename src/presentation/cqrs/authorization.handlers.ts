import { Inject } from '@nestjs/common';
import { CommandHandler, QueryHandler } from '@nestjs/cqrs';
import * as RoleCommandHandlers from '../../application/commands/role-command.handlers';
import * as RoleCommands from '../../application/commands/role.commands';
import * as AccessHandlers from '../../application/queries/access-query.handlers';
import * as AccessQueries from '../../application/queries/access.queries';
import * as PermissionQueryHandlers from '../../application/queries/permission-query.handlers';
import * as PermissionQueries from '../../application/queries/permission.queries';
import * as RoleQueryHandlers from '../../application/queries/role-query.handlers';
import * as RoleQueries from '../../application/queries/role.queries';
import type { PermissionRepositoryPort } from '../../application/ports/permission-repository.port';
import type { RoleRepositoryPort } from '../../application/ports/role-repository.port';
import type { UserDirectoryPort } from '../../application/ports/user-directory.port';
import type { UserRoleRepositoryPort } from '../../application/ports/user-role-repository.port';
import { AccessResolver } from '../../application/security/access-resolver';
import { AuthorizationGuard } from '../../application/security/authorization.guard';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_DIRECTORY,
  USER_ROLE_REPOSITORY,
} from '../../bootstrap/tokens';

// Nest adapters only register and inject the framework-free Application handlers.

@CommandHandler(RoleCommands.CreateRoleCommand)
export class NestCreateRoleHandler
  extends RoleCommandHandlers.CreateRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@CommandHandler(RoleCommands.UpdateRoleCommand)
export class NestUpdateRoleHandler
  extends RoleCommandHandlers.UpdateRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@CommandHandler(RoleCommands.DeleteRoleCommand)
export class NestDeleteRoleHandler
  extends RoleCommandHandlers.DeleteRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@CommandHandler(RoleCommands.AddRolePermissionsCommand)
export class NestAddRolePermissionsHandler
  extends RoleCommandHandlers.AddRolePermissionsHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@CommandHandler(RoleCommands.RemoveRolePermissionsCommand)
export class NestRemoveRolePermissionsHandler
  extends RoleCommandHandlers.RemoveRolePermissionsHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@CommandHandler(RoleCommands.AssignUserRoleCommand)
export class NestAssignUserRoleHandler
  extends RoleCommandHandlers.AssignUserRoleHandler
{
  constructor(
    @Inject(USER_DIRECTORY) directory: UserDirectoryPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(directory, roles, userRoles, guard);
  }
}

@QueryHandler(PermissionQueries.ListPermissionsQuery)
export class NestListPermissionsHandler
  extends PermissionQueryHandlers.ListPermissionsHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(permissions, guard);
  }
}
@QueryHandler(PermissionQueries.GetPermissionQuery)
export class NestGetPermissionHandler
  extends PermissionQueryHandlers.GetPermissionHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(permissions, guard);
  }
}
@QueryHandler(RoleQueries.ListRolesQuery)
export class NestListRolesHandler extends RoleQueryHandlers.ListRolesHandler {
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@QueryHandler(RoleQueries.GetRoleQuery)
export class NestGetRoleHandler extends RoleQueryHandlers.GetRoleHandler {
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@QueryHandler(RoleQueries.ListRoleUsersQuery)
export class NestListRoleUsersHandler
  extends RoleQueryHandlers.ListRoleUsersHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(roles, userRoles, guard);
  }
}
@QueryHandler(RoleQueries.GetUserRoleQuery)
export class NestGetUserRoleHandler
  extends RoleQueryHandlers.GetUserRoleHandler
{
  constructor(
    @Inject(USER_DIRECTORY) directory: UserDirectoryPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    guard: AuthorizationGuard,
  ) {
    super(directory, roles, userRoles, guard);
  }
}
@QueryHandler(AccessQueries.GetUserAccessQuery)
export class NestGetUserAccessHandler
  extends AccessHandlers.GetUserAccessHandler
{
  constructor(access: AccessResolver, guard: AuthorizationGuard) {
    super(access, guard);
  }
}
@QueryHandler(AccessQueries.GetMyAccessQuery)
export class NestGetMyAccessHandler extends AccessHandlers.GetMyAccessHandler {
  constructor(access: AccessResolver, guard: AuthorizationGuard) {
    super(access, guard);
  }
}
@QueryHandler(AccessQueries.ResolveAccessQuery)
export class NestResolveAccessHandler
  extends AccessHandlers.ResolveAccessHandler
{
  constructor(access: AccessResolver) {
    super(access);
  }
}

export const AuthorizationCqrsHandlers = [
  NestCreateRoleHandler,
  NestUpdateRoleHandler,
  NestDeleteRoleHandler,
  NestAddRolePermissionsHandler,
  NestRemoveRolePermissionsHandler,
  NestAssignUserRoleHandler,
  NestListPermissionsHandler,
  NestGetPermissionHandler,
  NestListRolesHandler,
  NestGetRoleHandler,
  NestListRoleUsersHandler,
  NestGetUserRoleHandler,
  NestGetUserAccessHandler,
  NestGetMyAccessHandler,
  NestResolveAccessHandler,
];
