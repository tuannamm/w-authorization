import { ApplicationError } from './errors/application-error';
import type { RoleRepositoryPort } from './ports/role-repository.port';
import type { Role } from '../domain/models/role';
import { assertValidRoleKey } from '../domain/policies/role.policy';

/** Validates the key format (400) then loads the role (404). */
export async function requireRole(
  roles: RoleRepositoryPort,
  key: string,
): Promise<Role> {
  assertValidRoleKey(key);
  const role = await roles.findByKey(key);
  if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
  return role;
}
