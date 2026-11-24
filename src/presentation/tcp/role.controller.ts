import { Controller, Logger, UseFilters } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as Commands from '../../application/commands/role.commands';
import * as Queries from '../../application/queries/role.queries';
import { audited } from './audit';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import {
  CreateRoleDto,
  ListRoleUsersQueryDto,
  RoleKeyParamDto,
  RolePermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { AuthorizationErrorFilter } from './filters/authorization-error.filter';

@Controller()
@UseFilters(AuthorizationErrorFilter)
export class RoleController {
  private readonly logger = new Logger('Authorization');
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  private key(req: GatewayRequest) {
    return parseInput(RoleKeyParamDto, req.params).key;
  }

  @MessagePattern('authorization.roles.list')
  list(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(new Queries.ListRolesQuery(actorOf(req))),
    );
  }

  @MessagePattern('authorization.roles.get')
  get(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(
        new Queries.GetRoleQuery({ key: this.key(req) }, actorOf(req)),
      ),
    );
  }

  @MessagePattern('authorization.roles.listUsers')
  listUsers(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () => {
      const { page, limit } = parseInput(
        ListRoleUsersQueryDto,
        req.query ?? {},
      );
      return this.queries.execute(
        new Queries.ListRoleUsersQuery(
          { key: this.key(req), page, limit },
          actorOf(req),
        ),
      );
    });
  }

  @MessagePattern('authorization.roles.create')
  create(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new Commands.CreateRoleCommand(
          { ...parseInput(CreateRoleDto, req.body) },
          actorOf(req),
        ),
      ),
    );
  }

  @MessagePattern('authorization.roles.update')
  update(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new Commands.UpdateRoleCommand(
          {
            key: this.key(req),
            patch: { ...parseInput(UpdateRoleDto, req.body) },
          },
          actorOf(req),
        ),
      ),
    );
  }

  @MessagePattern('authorization.roles.delete')
  delete(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new Commands.DeleteRoleCommand({ key: this.key(req) }, actorOf(req)),
      ),
    );
  }

  @MessagePattern('authorization.roles.addPermissions')
  addPermissions(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new Commands.AddRolePermissionsCommand(
          {
            key: this.key(req),
            permissionKeys: parseInput(RolePermissionsDto, req.body)
              .permissionKeys,
          },
          actorOf(req),
        ),
      ),
    );
  }

  @MessagePattern('authorization.roles.removePermissions')
  removePermissions(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new Commands.RemoveRolePermissionsCommand(
          {
            key: this.key(req),
            permissionKeys: parseInput(RolePermissionsDto, req.body)
              .permissionKeys,
          },
          actorOf(req),
        ),
      ),
    );
  }
}
