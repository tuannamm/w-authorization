import type { Role } from '../domain/models/role';
import { resolveEffectiveAccess } from '../domain/policies/access.policy';

export interface RoleView extends Role {
  userCount: number;
}

/**
 * Read model: `permissionKeys` is the effective list (admin = whole catalog,
 * computed here and never stored) plus how many users hold the role.
 */
export function toRoleView(role: Role, userCount: number): RoleView {
  return {
    ...role,
    permissionKeys: resolveEffectiveAccess('', role).permissions,
    userCount,
  };
}

/** `{ userId, role: { key, name } }`: response of users.getRole / users.assignRole. */
export function toUserRoleView(
  userId: string,
  role: Pick<Role, 'key' | 'name'>,
) {
  return { userId, role: { key: role.key, name: role.name } };
}
