import { ApplicationError } from '../errors/application-error';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserDirectoryPort } from '../ports/user-directory.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import {
  effectiveRoleKey,
  resolveEffectiveAccess,
} from '../../domain/policies/access.policy';
import type { EffectiveAccess } from '../../domain/models/user-role';

export interface ResolvedAccess {
  userId: string;
  /** Null only when the account does not exist in the identity provider. */
  role: { key: string; name: string } | null;
  permissions: string[];
}

export class AccessResolver {
  constructor(
    private readonly directory: UserDirectoryPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
  ) {}

  /** Local data only (no identity provider): what the role table grants. */
  async resolveStored(userId: string): Promise<EffectiveAccess> {
    const assignment = await this.userRoles.findByUserId(userId);
    const role = await this.roles.findByKey(effectiveRoleKey(assignment));
    // Fail closed: an assignment pointing at a missing role grants nothing.
    if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return resolveEffectiveAccess(userId, role);
  }

  /** Stored access, but a missing or locked account has no permissions. */
  async resolve(userId: string): Promise<ResolvedAccess> {
    const account = await this.directory.find(userId);
    if (!account) return { userId, role: null, permissions: [] };
    const stored = await this.resolveStored(userId);
    return account.enabled ? stored : { ...stored, permissions: [] };
  }
}
