import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AssignUserRoleCommand } from '../../application/commands/role.commands';
import {
  GetMyAccessQuery,
  ResolveAccessQuery,
} from '../../application/queries/access.queries';
import { ListRoleUsersQuery } from '../../application/queries/role.queries';
import { AccessController } from './access.controller';
import type { GatewayRequest } from './contracts/gateway.contracts';
import { RoleController } from './role.controller';
import { UserRoleController } from './user-role.controller';

const user = { sub: 'admin-1', iss: 'issuer' };
const req = (over: Partial<GatewayRequest>): GatewayRequest => ({
  params: {},
  query: {},
  meta: { requestId: 'r', operationId: 'op', project: 'p' },
  ...over,
});

describe('TCP controllers', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'log').mockImplementation());
  const bus = () => ({ execute: jest.fn().mockResolvedValue('ok') });

  it('access.resolve reads params.id and needs no actor', async () => {
    const queries = bus();
    const controller = new AccessController(queries as unknown as QueryBus);
    await controller.resolve(req({ params: { id: 'u1' } }));
    expect(queries.execute).toHaveBeenCalledWith(new ResolveAccessQuery('u1'));
  });

  it('access.resolve rejects a missing id', () => {
    const controller = new AccessController(bus() as unknown as QueryBus);
    expect(() => controller.resolve(req({}))).toThrow();
  });

  it('me.access builds the actor from the gateway user', async () => {
    const queries = bus();
    await new AccessController(queries as unknown as QueryBus).myAccess(
      req({ user }),
    );
    expect(queries.execute).toHaveBeenCalledWith(
      new GetMyAccessQuery({ userId: 'admin-1', issuer: 'issuer' }),
    );
  });

  it('me.access without a user is UNAUTHENTICATED', async () => {
    const controller = new AccessController(bus() as unknown as QueryBus);
    await expect(controller.myAccess(req({}))).rejects.toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    );
  });

  it('roles.listUsers parses page/limit from the query string', async () => {
    const queries = bus();
    const controller = new RoleController(
      bus() as unknown as CommandBus,
      queries as unknown as QueryBus,
    );
    await controller.listUsers(
      req({ user, params: { key: 'qa' }, query: { page: '2', limit: '5' } }),
    );
    expect(queries.execute).toHaveBeenCalledWith(
      new ListRoleUsersQuery(
        { key: 'qa', page: 2, limit: 5 },
        { userId: 'admin-1', issuer: 'issuer' },
      ),
    );
  });

  it('users.assignRole combines path id and body roleKey', async () => {
    const commands = bus();
    const controller = new UserRoleController(
      commands as unknown as CommandBus,
      bus() as unknown as QueryBus,
    );
    await controller.assignRole(
      req({ user, params: { id: 'u9' }, body: { roleKey: 'qa' } }),
    );
    expect(commands.execute).toHaveBeenCalledWith(
      new AssignUserRoleCommand(
        { userId: 'u9', roleKey: 'qa' },
        { userId: 'admin-1', issuer: 'issuer' },
      ),
    );
  });

  it('rejects an unknown body field instead of passing it on', async () => {
    const commands = bus();
    const controller = new UserRoleController(
      commands as unknown as CommandBus,
      bus() as unknown as QueryBus,
    );
    await expect(
      controller.assignRole(
        req({
          user,
          params: { id: 'u9' },
          body: { roleKey: 'qa', userId: 'x' },
        }),
      ),
    ).rejects.toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(commands.execute).not.toHaveBeenCalled();
  });
});
