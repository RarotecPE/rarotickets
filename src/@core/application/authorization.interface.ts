import type { Result } from '../domain/result.ts';
import type { DomainError } from '../domain/domain-error.base.ts';

export type AuthorizeActionParams = { actorId: string; permission: string };

export interface IAuthorizationService {
  authorize(params: AuthorizeActionParams): Promise<Result<boolean, DomainError>>;
}
