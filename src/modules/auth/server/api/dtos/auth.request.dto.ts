export type LoginRequestBody = { email: string; password: string };
export type AuthActionRequest =
  | { action: 'login'; email: string; password: string }
  | { action: 'logout' }
  | { action: 'me' };
