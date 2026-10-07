import "server-only";
import type { NextResponse } from "next/server";
import { readEnvironment } from "@/server/config/environment.config";
import { RAROTICKETS_SESSION_COOKIE, RAROTICKETS_SSO_NEXT_COOKIE, RAROTICKETS_SSO_STATE_COOKIE } from "./raronexus.client";

export type SessionCookieParams = { token: string };
export type TemporarySsoCookieParams = { state: string; nextPath: string };

export function setSessionCookie(response: NextResponse, params: SessionCookieParams): void {
  const environment = readEnvironment();
  response.cookies.set(RAROTICKETS_SESSION_COOKIE, params.token, {
    httpOnly: true,
    secure: environment.nodeEnvironment === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function setTemporarySsoCookies(response: NextResponse, params: TemporarySsoCookieParams): void {
  const environment = readEnvironment();
  const cookieOptions = {
    httpOnly: true,
    secure: environment.nodeEnvironment === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 5 * 60,
  };
  response.cookies.set(RAROTICKETS_SSO_STATE_COOKIE, params.state, cookieOptions);
  response.cookies.set(RAROTICKETS_SSO_NEXT_COOKIE, params.nextPath, cookieOptions);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(RAROTICKETS_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function clearTemporarySsoCookies(response: NextResponse): void {
  const environment = readEnvironment();
  const options = { httpOnly: true, secure: environment.nodeEnvironment === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };
  response.cookies.set(RAROTICKETS_SSO_STATE_COOKIE, "", options);
  response.cookies.set(RAROTICKETS_SSO_NEXT_COOKIE, "", options);
}
