import { User } from '../entities/user.entity';
import { UserEmail } from '../value-objects/user-email.vo';

export type UserId = string;
export type ListUsersParams = {
  search?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  page: number;
  perPage: number;
};
export type ListUsersResult = { users: User[]; total: number };

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: UserEmail): Promise<User | null>;
  existsByEmail(email: UserEmail, ignoreUserId?: UserId): Promise<boolean>;
  list(params: ListUsersParams): Promise<ListUsersResult>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
