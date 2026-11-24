import type { UserRole } from '../../domain/models/user-role';

export interface UserRolePage {
  items: UserRole[];
  total: number;
}

export interface UserRoleRepositoryPort {
  findByUserId(userId: string): Promise<UserRole | null>;
  /** Replaces the user's role (upsert on userId), so it is idempotent and race-safe. */
  assign(
    userId: string,
    roleKey: string,
    assignedBy: string,
  ): Promise<UserRole>;
  countByRole(roleKey: string): Promise<number>;
  /** Number of assignments per role key; roles without any are absent. */
  countsByRole(): Promise<Record<string, number>>;
  listByRole(
    roleKey: string,
    page: number,
    limit: number,
  ): Promise<UserRolePage>;
}
