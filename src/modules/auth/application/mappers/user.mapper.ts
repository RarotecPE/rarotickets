import { Mapper } from '@core/application/mapper.base';
import type { Permission } from '@core/domain/permissions';
import { ROLE_LABELS } from '@core/domain/permissions';
import type { User } from '../../domain/entities/user.entity';

export type MapUserParams = { user: User };
export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export class UserMapper extends Mapper<MapUserParams, UserDto> {
  public map({ user }: MapUserParams): UserDto {
    return {
      id: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
