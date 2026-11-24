export type DomainErrorCode =
  | 'INVALID_ROLE'
  | 'INVALID_PERMISSION'
  | 'SYSTEM_ROLE_PROTECTED'
  | 'DEFAULT_ROLE_PROTECTED'
  | 'LAST_ADMIN_PROTECTED';

/** Business failure with no framework, transport or database dependency. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
