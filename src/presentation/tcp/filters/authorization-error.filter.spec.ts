import { Logger, type ArgumentsHost } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DatabaseError } from '@lib-infrastructure/database';
import {
  ApplicationError,
  type ErrorCode,
} from '../../../application/errors/application-error';
import {
  DomainError,
  type DomainErrorCode,
} from '../../../domain/errors/domain-error';
import {
  AuthorizationErrorFilter,
  rpcError,
} from './authorization-error.filter';

describe('authorization RPC errors', () => {
  it.each<[ErrorCode, number]>([
    ['UNAUTHENTICATED', 401],
    ['FORBIDDEN', 403],
    ['VALIDATION_ERROR', 400],
    ['USER_NOT_FOUND', 404],
    ['ROLE_NOT_FOUND', 404],
    ['PERMISSION_NOT_FOUND', 404],
    ['ROLE_CONFLICT', 409],
    ['ROLE_IN_USE', 409],
    ['DEPENDENCY_UNAVAILABLE', 503],
    ['DEPENDENCY_FORBIDDEN', 503],
    ['OPERATION_UNCERTAIN', 502],
  ])('maps application %s to HTTP %s', (code, statusCode) => {
    expect(rpcError(new ApplicationError(code, 'Safe', { a: 1 }))).toEqual({
      statusCode,
      code,
      message: 'Safe',
      details: { a: 1 },
    });
  });

  it.each<[DomainErrorCode, number, string]>([
    ['SYSTEM_ROLE_PROTECTED', 409, 'SYSTEM_ROLE_PROTECTED'],
    ['DEFAULT_ROLE_PROTECTED', 409, 'DEFAULT_ROLE_PROTECTED'],
    ['LAST_ADMIN_PROTECTED', 409, 'LAST_ADMIN_PROTECTED'],
    ['INVALID_ROLE', 400, 'INVALID_ROLE'],
    ['INVALID_PERMISSION', 400, 'INVALID_PERMISSION'],
  ])('maps domain %s to HTTP %s', (code, statusCode, rpcCode) => {
    expect(rpcError(new DomainError(code, 'm'))).toEqual({
      statusCode,
      code: rpcCode,
      message: 'm',
    });
  });

  it('maps storage failures to 503 and hides unknown errors', () => {
    expect(rpcError(new DatabaseError()).statusCode).toBe(503);
    expect(rpcError(new Error('secret connection string'))).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal authorization service error',
    });
  });

  it('the filter rethrows the GatewayRpcError and logs without the body', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const host = {
      switchToRpc: () => ({
        getData: () => ({
          meta: { requestId: 'r1', operationId: 'authorization.roles.get' },
          user: { sub: 'u1' },
          params: { key: 'qa' },
          body: { password: 'secret' },
        }),
      }),
    } as unknown as ArgumentsHost;
    await expect(
      firstValueFrom(
        new AuthorizationErrorFilter().catch(
          new ApplicationError('ROLE_NOT_FOUND', 'Role not found'),
          host,
        ),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain('"target":"qa"');
    expect(line).not.toContain('secret');
  });
});
