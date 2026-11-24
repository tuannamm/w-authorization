import { ApplicationError } from '../errors/application-error';
import type { PermissionRepositoryPort } from '../ports/permission-repository.port';
import { AuthorizationGuard } from '../security/authorization.guard';
import { DomainError } from '../../domain/errors/domain-error';
import { isValidPermissionKey } from '../../domain/policies/role.policy';
import { GetPermissionQuery, ListPermissionsQuery } from './permission.queries';

export class ListPermissionsHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ actor }: ListPermissionsQuery) {
    await this.guard.require(actor, 'permissions:read');
    return { items: await this.permissions.list() };
  }
}

export class GetPermissionHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: GetPermissionQuery) {
    await this.guard.require(actor, 'permissions:read');
    // Format check only: an unknown but well-formed key is a 404, not a 400.
    if (!isValidPermissionKey(input.key))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    const permission = await this.permissions.findByKey(input.key);
    if (!permission)
      throw new ApplicationError(
        'PERMISSION_NOT_FOUND',
        'Permission not found',
      );
    return permission;
  }
}
