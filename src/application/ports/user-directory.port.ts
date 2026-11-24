export interface DirectoryUser {
  userId: string;
  enabled: boolean;
}

/** Read-only view of the identity provider (Keycloak). */
export interface UserDirectoryPort {
  /** Null when the user does not exist. */
  find(userId: string): Promise<DirectoryUser | null>;
}
