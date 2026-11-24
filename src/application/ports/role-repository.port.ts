import type { Role, RoleKind, RolePatch } from '../../domain/models/role';

export interface NewRole {
  key: string;
  name: string;
  description?: string;
  kind: RoleKind;
  permissionKeys: string[];
}

/**
 * Mutations never touch `system` roles, even under a race: the repository
 * filters on kind, so the domain check is not the only line of defence.
 */
export interface RoleRepositoryPort {
  /** Rejects with ApplicationError ROLE_CONFLICT when the key exists. */
  insert(input: NewRole): Promise<Role>;
  /** Writes the role only when missing; never overwrites an admin's edits. True when created. */
  insertIfMissing(input: NewRole): Promise<boolean>;
  findByKey(key: string): Promise<Role | null>;
  list(): Promise<Role[]>;
  update(key: string, patch: RolePatch): Promise<Role | null>;
  /** False when the role is missing, system or default. */
  delete(key: string): Promise<boolean>;
  /** Atomic and idempotent ($addToSet / $pull). Null when absent or system. */
  addPermissions(key: string, permissionKeys: string[]): Promise<Role | null>;
  removePermissions(
    key: string,
    permissionKeys: string[],
  ): Promise<Role | null>;
  /** Removes keys that left the catalog from every role. */
  pullPermissionsEverywhere(permissionKeys: string[]): Promise<void>;
}
