import type { InternalUser } from '../entities/internal-user.aggregate.ts';
import type { IInternalUserRepository, InternalUserId, InternalUserListParams } from './internal-user-repository.interface.ts';

export abstract class InternalUserRepository implements IInternalUserRepository {
  abstract findById(id: InternalUserId): Promise<InternalUser | null>;
  abstract save(user: InternalUser): Promise<void>;
  abstract list(params: InternalUserListParams): Promise<InternalUser[]>;
}
