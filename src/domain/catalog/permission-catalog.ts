import type { Permission } from '../models/permission';

/**
 * Source of truth for permissions. A permission only means something when code
 * checks it, so the catalog lives in code and is synced into the database at boot.
 */
export const PERMISSION_CATALOG: readonly Permission[] = [
  { key: 'users:read', description: 'View user accounts' },
  { key: 'users:write', description: 'Create, update and lock user accounts' },
  { key: 'roles:read', description: 'View roles and user roles' },
  {
    key: 'roles:write',
    description: 'Create, update and delete roles; edit role permissions',
  },
  { key: 'roles:assign', description: 'Assign a role to a user' },
  { key: 'permissions:read', description: 'View the permission catalog' },
];

export const CATALOG_KEYS: readonly string[] = PERMISSION_CATALOG.map(
  (permission) => permission.key,
);
