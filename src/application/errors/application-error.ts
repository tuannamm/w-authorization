export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'USER_NOT_FOUND'
  | 'ROLE_NOT_FOUND'
  | 'PERMISSION_NOT_FOUND'
  | 'ROLE_CONFLICT'
  | 'ROLE_IN_USE'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'DEPENDENCY_FORBIDDEN'
  | 'OPERATION_UNCERTAIN';

export class ApplicationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
