import type { Logger } from '@nestjs/common';
import type { GatewayRequest } from './contracts/gateway.contracts';

/** Runs a handler and writes one structured audit line on success (failures are logged by the filter). */
export async function audited<T>(
  logger: Logger,
  req: GatewayRequest,
  action: () => Promise<T>,
): Promise<T> {
  const result = await action();
  logger.log(
    JSON.stringify({
      requestId: req.meta?.requestId,
      actor: req.user?.sub,
      operation: req.meta?.operationId,
      target: req.params?.key ?? req.params?.id,
      result: 'success',
    }),
  );
  return result;
}
