import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { PermissionRepositoryPort } from '../application/ports/permission-repository.port';
import type { RoleRepositoryPort } from '../application/ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../application/ports/user-role-repository.port';
import { ADMIN_ROLE_KEY, SEED_ROLES } from '../domain/catalog/default-roles';
import { PERMISSION_CATALOG } from '../domain/catalog/permission-catalog';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './tokens';

export const BOOTSTRAP_ACTOR = 'bootstrap';

/**
 * Runs at every start. Idempotent, so it is safe when several replicas boot together:
 * 1. catalog in code -> `permissions` collection; keys that left the code are
 *    removed there and pulled from every role (so a role never holds a dead key);
 * 2. the three seed roles are written only when missing (admin edits survive);
 * 3. BOOTSTRAP_ADMIN_USER_ID is promoted to admin (also the way to recover from
 *    a lost last admin: set the variable and restart).
 */
@Injectable()
export class RbacSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger('RbacSeeder');
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
    // Not a DI token: @Optional lets Nest pass undefined so the env default applies.
    @Optional()
    private readonly bootstrapAdminUserId: string | undefined = process.env
      .BOOTSTRAP_ADMIN_USER_ID,
  ) {}

  onApplicationBootstrap() {
    return this.seed();
  }

  async seed() {
    const removed = await this.permissions.sync(PERMISSION_CATALOG);
    if (removed.length) {
      await this.roles.pullPermissionsEverywhere(removed);
      this.logger.warn(
        `Permissions removed from the catalog and from all roles: ${removed.join(', ')}`,
      );
    }
    for (const role of SEED_ROLES) await this.roles.insertIfMissing(role);

    const adminId = this.bootstrapAdminUserId?.trim();
    if (!adminId) return;
    const current = await this.userRoles.findByUserId(adminId);
    if (current?.roleKey !== ADMIN_ROLE_KEY)
      await this.userRoles.assign(adminId, ADMIN_ROLE_KEY, BOOTSTRAP_ACTOR);
  }
}
