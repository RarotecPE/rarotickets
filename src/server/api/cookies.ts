import type { Response, CookieOptions } from 'express';
import type { AppConfig } from '../config/app.config';

export const AUTH_COOKIE_NAMES = {
  globalSession: 'rarotickets_global_session',
  demoSession: 'rarotickets_demo_session',
  ssoState: 'rarotickets_sso_state',
  ssoNext: 'rarotickets_sso_next',
  ssoMode: 'rarotickets_sso_mode',
} as const;

export type ReadCookieParams = {
  cookieHeader: string | undefined;
  name: string;
};
export type WriteAuthCookieParams = { response: Response; config: AppConfig; name: string; value: string };
export type AuthCookieScopeParams = { response: Response; config: AppConfig };
export type ClearAuthCookieParams = AuthCookieScopeParams & { name: string };

export function readCookie(params: ReadCookieParams): string | null {
  if (!params.cookieHeader) return null;
  const expectedName = `${params.name}=`;
  const cookie = params.cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(expectedName));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(expectedName.length));
  } catch {
    return null;
  }
}

export function setSessionCookie(params: WriteAuthCookieParams): void {
  params.response.cookie(params.name, params.value, {
    ...baseCookieOptions(params.config),
    maxAge: params.config.sessionCookieMaxAgeSeconds * 1000,
  });
}

export function setTemporaryCookie(params: WriteAuthCookieParams): void {
  params.response.cookie(params.name, params.value, {
    ...baseCookieOptions(params.config),
    maxAge: 5 * 60 * 1000,
  });
}

export function clearCookie(params: ClearAuthCookieParams): void {
  params.response.clearCookie(params.name, baseCookieOptions(params.config));
}

export function clearSsoCookies(params: AuthCookieScopeParams): void {
  clearCookie({ ...params, name: AUTH_COOKIE_NAMES.ssoState });
  clearCookie({ ...params, name: AUTH_COOKIE_NAMES.ssoNext });
  clearCookie({ ...params, name: AUTH_COOKIE_NAMES.ssoMode });
}

export function clearSessionCookies(params: AuthCookieScopeParams): void {
  clearCookie({ ...params, name: AUTH_COOKIE_NAMES.globalSession });
  clearCookie({ ...params, name: AUTH_COOKIE_NAMES.demoSession });
}

function baseCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  };
}
