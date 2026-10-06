import type { AuthSessionDto } from '../../types/auth-session.types';

export type CompleteRaroNexusLoginOutputDto = {
  token: string;
  session: AuthSessionDto;
};
