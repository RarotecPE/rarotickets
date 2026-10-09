import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readEnvironment, isRaroNexusConfigured } from "@/server/config/environment.config";

export type BuildAuthorizationUrlParams = { state: string; redirectUri: string; silent: boolean };
export type CreateSsoStateParams = { nextPath: string };
export type SsoState = { state: string; nextPath: string };

export function buildAuthorizationUrl(params: BuildAuthorizationUrlParams): URL {
  if (!isRaroNexusConfigured()) throw new Error("A integração RaroNexus ainda não está configurada.");
  const environment = readEnvironment();
  const authorizeUrl = new URL(`${environment.raroNexusBaseUrl}/sso/authorize`);
  authorizeUrl.searchParams.set("client_id", environment.raroNexusClientId);
  authorizeUrl.searchParams.set("redirect_uri", params.redirectUri);
  authorizeUrl.searchParams.set("state", params.state);
  if (params.silent) authorizeUrl.searchParams.set("prompt", "none");
  return authorizeUrl;
}

export function createSsoState(params: CreateSsoStateParams): SsoState {
  return { state: randomBytes(24).toString("base64url"), nextPath: validateInternalPath(params.nextPath) };
}

export function stateMatches(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function validateInternalPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/painel";
  const parsed = new URL(value, "https://rarotickets.local");
  if (parsed.origin !== "https://rarotickets.local" || parsed.pathname.startsWith("/api/") || parsed.pathname === "/login") return "/painel";
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
