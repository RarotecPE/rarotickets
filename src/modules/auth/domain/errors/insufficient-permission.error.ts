import { ForbiddenError } from '@core/domain/errors/forbidden.error';
import type { Permission } from '@core/domain/permissions';

export type InsufficientPermissionErrorParams = { permission: Permission };

export class InsufficientPermissionError extends ForbiddenError {
  constructor(params: InsufficientPermissionErrorParams) {
    super({ message: `Permissão ${params.permission} é necessária para esta operação`, code: 'INSUFFICIENT_PERMISSION' });
  }
}
