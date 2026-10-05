import type { UserDto } from '../../mappers/user.mapper';

export type LoginOutputDto = { token: string; expiresAt: Date; user: UserDto };
