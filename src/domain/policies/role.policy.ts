import { CATALOG_KEYS } from '../catalog/permission-catalog';
import { ADMIN_ROLE_KEY } from '../catalog/default-roles';
import { DomainError } from '../errors/domain-error';
import type { CreateRole, Role, RolePatch } from '../models/role';

const PERMISSION_KEY = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
const ROLE_KEY = /^[a-z][a-z0-9-]{1,49}$/;
const MAX_NAME = 100;
const MAX_DESCRIPTION = 255;

export function isValidPermissionKey(key: unknown): key is string {
  return (
    typeof key === 'string' && key.length <= 100 && PERMISSION_KEY.test(key)
  );
}

export function isValidRoleKey(key: unknown): key is string {
  return typeof key === 'string' && ROLE_KEY.test(key);
}

export function assertValidRoleKey(key: unknown): asserts key is string {
  if (!isValidRoleKey(key))
    throw new DomainError(
      'INVALID_ROLE',
      'Role key must be 2-50 chars: a-z, 0-9 or -, starting with a letter',
    );
}

/**
 * Validates, de-duplicates (order preserved) and checks every key against the
 * catalog. `catalog` is injectable so tests do not depend on the real one.
 */
export function assertValidPermissionKeys(
  keys: unknown,
  catalog: readonly string[] = CATALOG_KEYS,
): string[] {
  if (!Array.isArray(keys))
    throw new DomainError(
      'INVALID_PERMISSION',
      'permissionKeys must be an array',
    );
  const result: string[] = [];
  for (const key of keys) {
    if (!isValidPermissionKey(key))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    if (!catalog.includes(key))
      throw new DomainError(
        'INVALID_PERMISSION',
        `Permission is not in the catalog: ${key}`,
      );
    if (!result.includes(key)) result.push(key);
  }
  return result;
}

/** Like text() but a blank string is allowed and means "clear" (normalised to ''). */
function optionalText(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max)
    throw new DomainError('INVALID_ROLE', 'Invalid description');
  return value.trim();
}

function text(value: unknown, max: number, what: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new DomainError('INVALID_ROLE', `Invalid ${what}`);
  return value.trim();
}

export function validateCreateRole(
  input: CreateRole,
  catalog: readonly string[] = CATALOG_KEYS,
): Required<Pick<CreateRole, 'key' | 'name' | 'permissionKeys'>> &
  Pick<CreateRole, 'description'> {
  assertValidRoleKey(input?.key);
  if (input.key === ADMIN_ROLE_KEY)
    throw new DomainError('SYSTEM_ROLE_PROTECTED', 'The admin key is reserved');
  return {
    key: input.key,
    name: text(input.name, MAX_NAME, 'role name'),
    permissionKeys: assertValidPermissionKeys(
      input.permissionKeys ?? [],
      catalog,
    ),
    ...(input.description !== undefined && {
      description: text(input.description, MAX_DESCRIPTION, 'description'),
    }),
  };
}

export function validateRolePatch(patch: RolePatch): RolePatch {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch))
    throw new DomainError('INVALID_ROLE', 'Invalid role');
  if (Object.keys(patch).some((key) => key !== 'name' && key !== 'description'))
    throw new DomainError('INVALID_ROLE', 'Unknown input field');
  if (patch.name === undefined && patch.description === undefined)
    throw new DomainError(
      'INVALID_ROLE',
      'At least one role field is required',
    );
  return {
    ...(patch.name !== undefined && {
      name: text(patch.name, MAX_NAME, 'role name'),
    }),
    ...(patch.description !== undefined && {
      description: optionalText(patch.description, MAX_DESCRIPTION),
    }),
  };
}

export type RoleAction = 'update' | 'delete' | 'editPermissions';

/**
 * system: nothing is allowed. default: permissions and text editable, never
 * deletable. custom: everything. (A role's key is never editable.)
 */
export function assertRoleMutable(
  role: Pick<Role, 'kind'>,
  action: RoleAction,
): void {
  if (role.kind === 'system')
    throw new DomainError(
      'SYSTEM_ROLE_PROTECTED',
      'The system role cannot be modified or deleted',
    );
  if (role.kind === 'default' && action === 'delete')
    throw new DomainError(
      'DEFAULT_ROLE_PROTECTED',
      'Default roles cannot be deleted',
    );
}
