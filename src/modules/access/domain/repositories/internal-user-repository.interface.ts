import type { InternalUser } from '../entities/internal-user.aggregate.ts';

export type InternalUserId = string;
export type InternalUserListParams = { offset: number; limit: number };

export interface IInternalUserRepository {
  findById(id: InternalUserId): Promise<InternalUser | null>;
  save(user: InternalUser): Promise<void>;
  list(params: InternalUserListParams): Promise<InternalUser[]>;
}
