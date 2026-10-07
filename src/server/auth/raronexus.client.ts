import "server-only";
import { RolePermissionsDomainService } from "@/modules/access/domain/services/role-permissions.domain-service";
import type { Permission } from "@/modules/access/domain/services/role-permissions.domain-service";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { isRaroNexusConfigured, readEnvironment } from "@/server/config/environment.config";
import { AuthFailure } from "./auth.errors";
import type { AuthSession, RaroNexusProfile, RaroNexusUser } from "./auth.types";

export const RAROTICKETS_SESSION_COOKIE = "rarotickets_global_session";
export const RAROTICKETS_SSO_STATE_COOKIE = "rarotickets_sso_state";
export const RAROTICKETS_SSO_NEXT_COOKIE = "rarotickets_sso_next";

export type AuthorizationCodeExchangeParams = { code: string; redirectUri: string };
export type SessionTokenParams = { token: string };
export type AccessCheckParams = { token: string; permission: Permission };
export type ExchangeResponse = { token: string; user: RaroNexusUser; role: RaroNexusProfile };

type NexusEnvelope<T> = { success: boolean; data?: T; message?: string };
type TokenResponseData = { global_session_token?: unknown; user?: unknown; role?: unknown };
type IntrospectionResponseData = { active?: unknown; user?: unknown; role?: unknown };

export class RaroNexusClient {
  private readonly roleResolver: RolePermissionsDomainService;

  constructor() {
    this.roleResolver = new RolePermissionsDomainService();
  }

  async exchangeCode(params: AuthorizationCodeExchangeParams): Promise<ExchangeResponse> {
    this.ensureConfigured();
    const environment = readEnvironment();
    const response = await fetch(`${environment.raroNexusBaseUrl}/api/v1/sso/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: environment.raroNexusClientId,
        client_secret: environment.raroNexusClientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const envelope = await readEnvelope<TokenResponseData>(response);
    if (!response.ok || !envelope?.success || !envelope.data) {
      throw new Error("O RaroNexus não aceitou a troca do código de autorização.");
    }
    const token = readText(envelope.data.global_session_token);
    const user = parseUser(envelope.data.user);
    const role = parseRole(envelope.data.role);
    if (!token || !user || !role) throw new Error("Resposta de sessão inválida do RaroNexus.");
    const roleResult = this.roleResolver.execute({ externalRoleKey: role.chave, configuredRoles: environment.raroNexusRoleKeys });
    if (roleResult.isFailure) throw new AuthFailure({ kind: "forbidden", code: "UNKNOWN_ROLE", message: roleResult.error.message, httpStatus: 403 });
    return { token, user, role };
  }

  async introspect(params: SessionTokenParams): Promise<AuthSession> {
    this.ensureConfigured();
    const environment = readEnvironment();
    const response = await fetch(`${environment.raroNexusBaseUrl}/api/v1/sessions/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: params.token, client_id: environment.raroNexusClientId }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const envelope = await readEnvelope<IntrospectionResponseData>(response);
    if (!response.ok || !envelope?.success || !envelope.data || envelope.data.active !== true) {
      throw new Error("A sessão central está inativa ou não pôde ser validada.");
    }
    const user = parseUser(envelope.data.user);
    const role = parseRole(envelope.data.role);
    if (!user || !role) throw new Error("O perfil de sessão retornado pelo RaroNexus é inválido.");
    const roleResult = this.roleResolver.execute({ externalRoleKey: role.chave, configuredRoles: environment.raroNexusRoleKeys });
    if (roleResult.isFailure) {
      throw new AuthFailure({ kind: "forbidden", code: "UNKNOWN_ROLE", message: roleResult.error.message, httpStatus: 403 });
    }
    return {
      user,
      role: roleResult.value.role,
      roleKey: role.chave,
      label: roleResult.value.label,
      permissions: roleResult.value.permissions,
    };
  }

  async revoke(params: SessionTokenParams): Promise<boolean> {
    this.ensureConfigured();
    const environment = readEnvironment();
    const response = await fetch(`${environment.raroNexusBaseUrl}/api/v1/sessions/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: params.token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const envelope = await readEnvelope<{ revoked?: unknown }>(response);
    return response.ok && Boolean(envelope?.success);
  }

  async validateAccess(params: AccessCheckParams): Promise<AuthSession> {
    const session = await this.introspect({ token: params.token });
    if (!session.permissions.includes(params.permission)) {
      throw new AuthFailure({ kind: "forbidden", code: "PERMISSION_DENIED", message: "Você não tem permissão para realizar esta ação.", httpStatus: 403 });
    }
    return session;
  }

  private ensureConfigured(): void {
    if (!isRaroNexusConfigured()) {
      throw new AuthFailure({ kind: "unavailable", code: "SSO_NOT_CONFIGURED", message: "A integração com RaroNexus ainda não está configurada.", httpStatus: 503 });
    }
  }
}

export function createRaroNexusClient(): RaroNexusClient {
  return new RaroNexusClient();
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseUser(value: unknown): RaroNexusUser | null {
  if (!isRecord(value)) return null;
  const id = readText(value.id);
  const nome = readText(value.nome);
  const emailResult = Email.create(readText(value.email));
  if (!id || !nome || emailResult.isFailure) return null;
  return { id, nome, email: emailResult.value.value, avatar_url: readText(value.avatar_url) || null };
}

function parseRole(value: unknown): RaroNexusProfile | null {
  if (!isRecord(value)) return null;
  const chave = readText(value.chave);
  const nome = readText(value.nome);
  return chave && nome ? { chave, nome } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readEnvelope<T>(response: Response): Promise<NexusEnvelope<T> | null> {
  const body: unknown = await response.json().catch(() => null);
  return isRecord(body) ? body as NexusEnvelope<T> : null;
}
