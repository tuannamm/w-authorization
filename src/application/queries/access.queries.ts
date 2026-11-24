import type { Actor } from '../security/actor';

export class GetUserAccessQuery {
  constructor(
    readonly input: { userId: string },
    readonly actor?: Actor,
  ) {}
}
export class GetMyAccessQuery {
  constructor(readonly actor?: Actor) {}
}
/** Internal: the gateway asks what a user may do. No actor, no HTTP route. */
export class ResolveAccessQuery {
  constructor(readonly userId: string) {}
}
