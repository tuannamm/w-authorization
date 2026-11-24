/** Each user holds exactly one role. No record means the default role. */
export interface UserRole {
  userId: string;
  roleKey: string;
  assignedBy: string;
  assignedAt: string;
}

export interface EffectiveAccess {
  userId: string;
  role: { key: string; name: string };
  permissions: string[];
}
