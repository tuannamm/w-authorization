import type { RoleKind } from '../models/role';

export const ADMIN_ROLE_KEY = 'admin';
export const DEFAULT_ROLE_KEY = 'member';

export interface SeedRole {
  key: string;
  name: string;
  description: string;
  kind: RoleKind;
  /** Initial permissions, written only when the role does not exist yet. */
  permissionKeys: string[];
}

export const SEED_ROLES: readonly SeedRole[] = [
  {
    key: ADMIN_ROLE_KEY,
    name: 'Admin',
    description: 'Full access. Always holds every catalog permission.',
    kind: 'system',
    permissionKeys: [],
  },
  {
    key: 'senior-manager',
    name: 'Senior Manager',
    description: 'Can view users, roles and permissions',
    kind: 'default',
    permissionKeys: ['users:read', 'roles:read', 'permissions:read'],
  },
  {
    key: DEFAULT_ROLE_KEY,
    name: 'Member',
    description: 'Default role of every account',
    kind: 'default',
    permissionKeys: [],
  },
];
