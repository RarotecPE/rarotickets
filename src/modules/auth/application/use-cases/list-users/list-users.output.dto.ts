import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { UserDto } from '../../mappers/user.mapper';

export type ListUsersOutputDto = { users: UserDto[]; meta: PaginationMeta };
