/**
 * system  - `admin`: fully locked, always has every catalog permission.
 * default - `senior-manager`, `member`: permissions editable, never deletable.
 * custom  - created through the API: full CRUD.
 */
export type RoleKind = 'system' | 'default' | 'custom';

export interface Role {
  /** Immutable slug, referenced by user_roles and code. */
  key: string;
  /** Display name, editable. */
  name: string;
  description?: string;
  kind: RoleKind;
  /** admin: always []; its permissions are computed at read time. */
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRole {
  key: string;
  name: string;
  description?: string;
  permissionKeys?: string[];
}

export interface RolePatch {
  name?: string;
  /** Empty string clears the description. */
  description?: string;
}
