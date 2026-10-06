import { Mapper } from '../../../../@core/application/mapper.base';
import type { AuthSession } from '../../domain/entities/auth-session.entity';
import type { AuthSessionDto } from '../types/auth-session.types';

export type MapAuthSessionParams = { session: AuthSession };

export class AuthSessionMapper extends Mapper<MapAuthSessionParams, AuthSessionDto> {
  map(params: MapAuthSessionParams): AuthSessionDto {
    const { session } = params;
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        avatarUrl: session.user.avatarUrl,
      },
      role: {
        key: session.role.key,
        name: session.role.label,
      },
      permissions: session.role.permissions,
    };
  }
}
