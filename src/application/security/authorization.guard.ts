import { ApplicationError } from '../errors/application-error';
import type { Actor } from './actor';
import type { AccessResolver } from './access-resolver';

/**
 * Defence in depth. The gateway already enforced `x-required-permissions`; the
 * worker checks again against its own data, so a direct TCP call cannot skip it.
 */
export class AuthorizationGuard {
  constructor(
    private readonly issuer: string,
    private readonly access: AccessResolver,
  ) {}

  authenticated(actor?: Actor): asserts actor is Actor {
    if (!actor?.userId || actor.issuer !== this.issuer)
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authenticated identity is required',
      );
  }

  async require(actor: Actor | undefined, permission: string): Promise<Actor> {
    this.authenticated(actor);
    const { permissions } = await this.access.resolveStored(actor.userId);
    if (!permissions.includes(permission))
      throw new ApplicationError('FORBIDDEN', 'Permission denied');
    return actor;
  }
}
