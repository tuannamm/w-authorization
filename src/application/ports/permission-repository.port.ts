import type { Permission } from '../../domain/models/permission';

export interface PermissionRepositoryPort {
  list(): Promise<Permission[]>;
  findByKey(key: string): Promise<Permission | null>;
  /**
   * Makes the stored permissions equal to `catalog` (upsert new/changed keys,
   * delete the rest). Returns the keys that were removed.
   */
  sync(catalog: readonly Permission[]): Promise<string[]>;
}
