import type { AuthSessionDto } from '../../modules/auth/application/types/auth-session.types';

export type AuthContext = {
  session: AuthSessionDto;
  globalToken: string | null;
  isDemo: boolean;
};
