import { Controller, Logger, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetPermissionQuery,
  ListPermissionsQuery,
} from '../../application/queries/permission.queries';
import { audited } from './audit';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { PermissionKeyParamDto } from './dto/role.dto';
import { AuthorizationErrorFilter } from './filters/authorization-error.filter';

@Controller()
@UseFilters(AuthorizationErrorFilter)
export class PermissionController {
  private readonly logger = new Logger('Authorization');
  constructor(private readonly queries: QueryBus) {}

  @MessagePattern('authorization.permissions.list')
  list(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(new ListPermissionsQuery(actorOf(req))),
    );
  }

  @MessagePattern('authorization.permissions.get')
  get(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(
        new GetPermissionQuery(
          { key: parseInput(PermissionKeyParamDto, req.params).key },
          actorOf(req),
        ),
      ),
    );
  }
}
