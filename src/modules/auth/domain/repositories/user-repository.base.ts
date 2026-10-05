import type { User } from '../entities/user.entity';
import type { UserEmail } from '../value-objects/user-email.vo';
import type { IUserRepository, ListUsersParams, ListUsersResult, UserId } from './user-repository.interface';

export abstract class UserRepository implements IUserRepository {
  abstract findById(id: UserId): Promise<User | null>;
  abstract findByEmail(email: UserEmail): Promise<User | null>;
  abstract existsByEmail(email: UserEmail, ignoreUserId?: UserId): Promise<boolean>;
  abstract list(params: ListUsersParams): Promise<ListUsersResult>;
  abstract save(user: User): Promise<void>;
  abstract update(user: User): Promise<void>;
}
