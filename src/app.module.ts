import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthModule, ServiceDiscoveryModule } from '@lib-infrastructure/core';
import {
  DatabaseModule,
  createDatabaseIndicator,
  getDatabaseConnectionToken,
  type DatabaseConnection,
} from '@lib-infrastructure/database';
import {
  KeycloakHttpClient,
  KeycloakModule,
} from '@lib-infrastructure/keycloak';
import { AccessResolver } from './application/security/access-resolver';
import { AuthorizationGuard } from './application/security/authorization.guard';
import { RbacSeeder } from './bootstrap/rbac.seeder';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_DIRECTORY,
  USER_ROLE_REPOSITORY,
} from './bootstrap/tokens';
import { KeycloakUserDirectory } from './infrastructure/keycloak/keycloak-user-directory';
import { PermissionRepository } from './infrastructure/persistence/mongoose/permission/permission.repository';
import { RoleRepository } from './infrastructure/persistence/mongoose/role/role.repository';
import { UserRoleRepository } from './infrastructure/persistence/mongoose/user-role/user-role.repository';
import { AuthorizationCqrsHandlers } from './presentation/cqrs/authorization.handlers';
import { AccessController } from './presentation/tcp/access.controller';
import { PermissionController } from './presentation/tcp/permission.controller';
import { RoleController } from './presentation/tcp/role.controller';
import { UserRoleController } from './presentation/tcp/user-role.controller';

@Module({
  imports: [
    CqrsModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    DatabaseModule,
    DatabaseModule.forFeature([
      PermissionRepository,
      RoleRepository,
      UserRoleRepository,
    ]),
    KeycloakModule,
    ServiceDiscoveryModule.forRoot(),
    HealthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [getDatabaseConnectionToken()],
      useFactory: (connection: DatabaseConnection) => ({
        indicators: [createDatabaseIndicator(connection)],
      }),
    }),
  ],
  controllers: [
    PermissionController,
    RoleController,
    UserRoleController,
    AccessController,
  ],
  providers: [
    { provide: PERMISSION_REPOSITORY, useExisting: PermissionRepository },
    { provide: ROLE_REPOSITORY, useExisting: RoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: UserRoleRepository },
    {
      provide: USER_DIRECTORY,
      inject: [KeycloakHttpClient],
      useFactory: (client: KeycloakHttpClient) =>
        new KeycloakUserDirectory(client),
    },
    {
      provide: AccessResolver,
      inject: [USER_DIRECTORY, ROLE_REPOSITORY, USER_ROLE_REPOSITORY],
      useFactory: (directory, roles, userRoles) =>
        new AccessResolver(directory, roles, userRoles),
    },
    {
      provide: AuthorizationGuard,
      inject: [ConfigService, AccessResolver],
      useFactory: (config: ConfigService, access: AccessResolver) =>
        new AuthorizationGuard(
          config.get<string>('KEYCLOAK_ISSUER', ''),
          access,
        ),
    },
    RbacSeeder,
    ...AuthorizationCqrsHandlers,
  ],
})
export class AppModule {}
