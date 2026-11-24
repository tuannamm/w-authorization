import { KeycloakHttpClient } from '@lib-infrastructure/keycloak';
import { ApplicationError } from '../../application/errors/application-error';
import type {
  DirectoryUser,
  UserDirectoryPort,
} from '../../application/ports/user-directory.port';
import { mapKeycloakError } from './keycloak-error';

interface Representation {
  id: string;
  enabled: boolean;
}

/** Read-only: asks Keycloak whether a user exists and is enabled. Never writes. */
export class KeycloakUserDirectory implements UserDirectoryPort {
  constructor(private readonly http: KeycloakHttpClient) {}

  async find(userId: string): Promise<DirectoryUser | null> {
    try {
      const user = await this.http.json<Representation>(
        `/users/${encodeURIComponent(userId)}`,
      );
      return { userId: user.id, enabled: user.enabled === true };
    } catch (error) {
      try {
        return mapKeycloakError(error);
      } catch (mapped) {
        if (
          mapped instanceof ApplicationError &&
          mapped.code === 'USER_NOT_FOUND'
        )
          return null;
        throw mapped;
      }
    }
  }
}
