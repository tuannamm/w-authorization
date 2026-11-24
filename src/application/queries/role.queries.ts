import type { Actor } from '../security/actor';

export class ListRolesQuery {
  constructor(readonly actor?: Actor) {}
}
export class GetRoleQuery {
  constructor(
    readonly input: { key: string },
    readonly actor?: Actor,
  ) {}
}
export class ListRoleUsersQuery {
  constructor(
    readonly input: { key: string; page: number; limit: number },
    readonly actor?: Actor,
  ) {}
}
export class GetUserRoleQuery {
  constructor(
    readonly input: { userId: string },
    readonly actor?: Actor,
  ) {}
}
