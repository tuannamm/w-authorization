import type { CreateRole, RolePatch } from '../../domain/models/role';
import type { Actor } from '../security/actor';

export class CreateRoleCommand {
  constructor(
    readonly input: CreateRole,
    readonly actor?: Actor,
  ) {}
}
export class UpdateRoleCommand {
  constructor(
    readonly input: { key: string; patch: RolePatch },
    readonly actor?: Actor,
  ) {}
}
export class DeleteRoleCommand {
  constructor(
    readonly input: { key: string },
    readonly actor?: Actor,
  ) {}
}
export class AddRolePermissionsCommand {
  constructor(
    readonly input: { key: string; permissionKeys: string[] },
    readonly actor?: Actor,
  ) {}
}
export class RemoveRolePermissionsCommand {
  constructor(
    readonly input: { key: string; permissionKeys: string[] },
    readonly actor?: Actor,
  ) {}
}
export class AssignUserRoleCommand {
  constructor(
    readonly input: { userId: string; roleKey: string },
    readonly actor?: Actor,
  ) {}
}
