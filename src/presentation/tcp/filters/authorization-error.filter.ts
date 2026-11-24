import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { throwError } from 'rxjs';
import { DatabaseError } from '@lib-infrastructure/database';
import { ApplicationError } from '../../../application/errors/application-error';
import { DomainError } from '../../../domain/errors/domain-error';
import type { GatewayRpcError } from '../contracts/gateway.contracts';

const APPLICATION_STATUS: Record<ApplicationError['code'], number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  USER_NOT_FOUND: 404,
  ROLE_NOT_FOUND: 404,
  PERMISSION_NOT_FOUND: 404,
  ROLE_CONFLICT: 409,
  ROLE_IN_USE: 409,
  DEPENDENCY_UNAVAILABLE: 503,
  DEPENDENCY_FORBIDDEN: 503,
  OPERATION_UNCERTAIN: 502,
};

export function rpcError(error: unknown): GatewayRpcError {
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'SYSTEM_ROLE_PROTECTED':
      case 'DEFAULT_ROLE_PROTECTED':
      case 'LAST_ADMIN_PROTECTED':
        return { statusCode: 409, code: error.code, message: error.message };
      default: // INVALID_ROLE, INVALID_PERMISSION keep their own code (UI maps them)
        return { statusCode: 400, code: error.code, message: error.message };
    }
  }
  if (error instanceof DatabaseError)
    return { statusCode: 503, code: error.code, message: error.message };
  if (error instanceof ApplicationError)
    return {
      statusCode: APPLICATION_STATUS[error.code],
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    };
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal authorization service error',
  };
}

@Catch()
export class AuthorizationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Authorization');
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToRpc().getData();
    const payload = rpcError(error);
    this.logger.warn(
      JSON.stringify({
        requestId: request?.meta?.requestId,
        actor: request?.user?.sub,
        operation: request?.meta?.operationId,
        target: request?.params?.key ?? request?.params?.id,
        result: payload.code,
      }),
    );
    return throwError(() => payload);
  }
}
