import { ApplicationError } from '../errors/application-error';
import type { AccessResolver } from '../security/access-resolver';
import { AuthorizationGuard } from '../security/authorization.guard';
import {
  GetMyAccessQuery,
  GetUserAccessQuery,
  ResolveAccessQuery,
} from './access.queries';

export class GetUserAccessHandler {
  constructor(
    private readonly access: AccessResolver,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ input, actor }: GetUserAccessQuery) {
    await this.guard.require(actor, 'roles:read');
    const result = await this.access.resolve(input.userId);
    if (result.role === null)
      throw new ApplicationError('USER_NOT_FOUND', 'User not found');
    return result;
  }
}

/** `/me/access` needs no permission, only a trusted identity. */
export class GetMyAccessHandler {
  constructor(
    private readonly access: AccessResolver,
    private readonly guard: AuthorizationGuard,
  ) {}
  async execute({ actor }: GetMyAccessQuery) {
    this.guard.authenticated(actor);
    return this.access.resolve(actor.userId);
  }
}

export class ResolveAccessHandler {
  constructor(private readonly access: AccessResolver) {}
  /** Unknown or locked account => `permissions: []` (fail closed, not an error). */
  execute({ userId }: ResolveAccessQuery) {
    return this.access.resolve(userId);
  }
}
