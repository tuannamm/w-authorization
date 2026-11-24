import { Controller, Logger, UseFilters } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AssignUserRoleCommand } from '../../application/commands/role.commands';
import { GetUserAccessQuery } from '../../application/queries/access.queries';
import { GetUserRoleQuery } from '../../application/queries/role.queries';
import { audited } from './audit';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { AssignRoleDto, UserIdParamDto } from './dto/user-role.dto';
import { AuthorizationErrorFilter } from './filters/authorization-error.filter';

@Controller()
@UseFilters(AuthorizationErrorFilter)
export class UserRoleController {
  private readonly logger = new Logger('Authorization');
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  private id(req: GatewayRequest) {
    return parseInput(UserIdParamDto, req.params).id;
  }

  @MessagePattern('authorization.users.getRole')
  getRole(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(
        new GetUserRoleQuery({ userId: this.id(req) }, actorOf(req)),
      ),
    );
  }

  @MessagePattern('authorization.users.assignRole')
  assignRole(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.commands.execute(
        new AssignUserRoleCommand(
          {
            userId: this.id(req),
            roleKey: parseInput(AssignRoleDto, req.body).roleKey,
          },
          actorOf(req),
        ),
      ),
    );
  }

  @MessagePattern('authorization.users.getAccess')
  getAccess(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(
        new GetUserAccessQuery({ userId: this.id(req) }, actorOf(req)),
      ),
    );
  }
}
