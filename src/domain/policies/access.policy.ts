import { CATALOG_KEYS } from '../catalog/permission-catalog';
import { ADMIN_ROLE_KEY, DEFAULT_ROLE_KEY } from '../catalog/default-roles';
import { DomainError } from '../errors/domain-error';
import type { Role } from '../models/role';
import type { EffectiveAccess, UserRole } from '../models/user-role';

/** The role key a user holds: the assignment, or the default when none exists. */
export function effectiveRoleKey(userRole: UserRole | null): string {
  return userRole?.roleKey ?? DEFAULT_ROLE_KEY;
}

/**
 * Effective permissions for a user. admin gets the whole catalog (computed, so a
 * permission added later needs no data change); every other role uses its list.
 * Output is de-duplicated and sorted so callers and caches see a stable value.
 */
export function resolveEffectiveAccess(
  userId: string,
  role: Pick<Role, 'key' | 'name' | 'permissionKeys'>,
  catalog: readonly string[] = CATALOG_KEYS,
): EffectiveAccess {
  const source = role.key === ADMIN_ROLE_KEY ? catalog : role.permissionKeys;
  return {
    userId,
    role: { key: role.key, name: role.name },
    permissions: [...new Set(source)].sort(),
  };
}

/** Blocks demoting the only remaining admin. Re-assigning admin is always fine. */
export function assertNotLastAdmin(
  currentRoleKey: string,
  newRoleKey: string,
  adminCount: number,
): void {
  if (
    currentRoleKey === ADMIN_ROLE_KEY &&
    newRoleKey !== ADMIN_ROLE_KEY &&
    adminCount <= 1
  )
    throw new DomainError(
      'LAST_ADMIN_PROTECTED',
      'The last admin cannot be demoted',
    );
}
