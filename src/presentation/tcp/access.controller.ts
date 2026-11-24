import { Controller, Logger, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  GetMyAccessQuery,
  ResolveAccessQuery,
} from '../../application/queries/access.queries';
import { audited } from './audit';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { actorOf } from './dto/actor.mapper';
import { parseInput } from './dto/parse-input';
import { UserIdParamDto } from './dto/user-role.dto';
import { AuthorizationErrorFilter } from './filters/authorization-error.filter';

@Controller()
@UseFilters(AuthorizationErrorFilter)
export class AccessController {
  private readonly logger = new Logger('Authorization');
  constructor(private readonly queries: QueryBus) {}

  /** UI calls this after login to render menus and buttons. */
  @MessagePattern('authorization.me.access')
  myAccess(@Payload() req: GatewayRequest) {
    return audited(this.logger, req, () =>
      this.queries.execute(new GetMyAccessQuery(actorOf(req))),
    );
  }

  /**
   * Internal: the gateway asks for a user's permissions (it caches 30 s). Keeps
   * the GatewayRequest shape the gateway already sends: the user id is in
   * `params.id`. No actor and no HTTP route; the gateway reads only `permissions`.
   */
  @MessagePattern('authorization.access.resolve')
  resolve(@Payload() req: GatewayRequest) {
    return this.queries.execute(
      new ResolveAccessQuery(parseInput(UserIdParamDto, req.params).id),
    );
  }
}
