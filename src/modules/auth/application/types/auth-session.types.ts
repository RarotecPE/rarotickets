import type { ApplicationPermission, ApplicationRoleKey } from '../../domain/value-objects/application-role.vo';

export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type AuthRoleDto = {
  key: ApplicationRoleKey;
  name: string;
};

export type AuthSessionDto = {
  user: AuthUserDto;
  role: AuthRoleDto;
  permissions: ApplicationPermission[];
};
