import { env } from "@/server/config/env";
import type { UserRole } from "@/lib/domain/types";

// ---------------------------------------------------------------------------
// Contratos tipados do RaroNexus
// ---------------------------------------------------------------------------
export type NexusUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
};

export type NexusRole = {
  chave: UserRole;
  nome: string;
};

export type NexusTokenResponse = {
  success: boolean;
  data?: {
    global_session_token: string;
    user: NexusUser;
    role: NexusRole;
  };
  message?: string;
};

export type NexusIntrospectResponse = {
  success: boolean;
  data?: {
    active: boolean;
    user: NexusUser;
    role: NexusRole;
  };
  message?: string;
};

export type NexusApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
  ativo: boolean;
};

export type NexusApplicationsResponse = {
  success: boolean;
  data?: NexusApplication[];
};

const VALID_ROLES: UserRole[] = [
  "ADMINISTRADOR",
  "GERENTE_EVENTO",
  "FINANCEIRO",
  "ATENDIMENTO",
  "CHECKIN",
  "CONSULTA",
];

/**
 * Cliente server-side para o RaroNexus.
 * Durante desenvolvimento com credenciais não preenchidas, opera em modo
 * simulado (mock) para permitir o trabalho local.
 */
export class RaroNexusClient {
  private get baseUrl(): string {
    return env.raronexus.baseUrl.replace(/\/$/, "");
  }

  private isMocked(): boolean {
    return !env.raronexus.clientSecret || env.raronexus.clientSecret === "dev-secret";
  }

  async exchangeCode(params: { code: string; redirectUri: string }): Promise<NexusTokenResponse> {
    if (this.isMocked()) {
      return this.mockToken();
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/sso/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: env.raronexus.clientId,
          client_secret: env.raronexus.clientSecret,
          code: params.code,
          redirect_uri: params.redirectUri,
        }),
      });
      return (await res.json()) as NexusTokenResponse;
    } catch {
      return { success: false, message: "RaroNexus indisponível" };
    }
  }

  async introspect(token: string): Promise<NexusIntrospectResponse> {
    if (this.isMocked()) {
      return this.mockIntrospect(token);
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/sessions/introspect`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, client_id: env.raronexus.clientId }),
      });
      return (await res.json()) as NexusIntrospectResponse;
    } catch {
      return { success: false, message: "RaroNexus indisponível" };
    }
  }

  async revoke(token: string): Promise<boolean> {
    if (this.isMocked()) return true;
    try {
      await fetch(`${this.baseUrl}/api/v1/sessions/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async listApplications(token: string): Promise<NexusApplication[]> {
    if (this.isMocked()) return [];
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/applications`, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Cookie: `raronexus_global_session=${encodeURIComponent(token)}`,
        },
      });
      const data = (await res.json()) as NexusApplicationsResponse;
      return data.data?.filter((a) => a.ativo && a.homepage_url && a.client_id !== env.raronexus.clientId) ?? [];
    } catch {
      return [];
    }
  }

  getAuthorizeUrl(params: { state: string; redirectUri: string; prompt?: "none" }): string {
    const url = new URL(`${this.baseUrl}/sso/authorize`);
    url.searchParams.set("client_id", env.raronexus.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    if (params.prompt) url.searchParams.set("prompt", params.prompt);
    return url.toString();
  }

  // ---- MOCK para desenvolvimento sem RaroNexus ----
  private mockToken(): NexusTokenResponse {
    return {
      success: true,
      data: {
        global_session_token: "mock-dev-token",
        user: {
          id: "mock-admin-id",
          nome: "Administrador (Mock)",
          email: "admin@rarotickets.local",
          avatar_url: null,
        },
        role: { chave: "ADMINISTRADOR", nome: "Administrador" },
      },
    };
  }

  private mockIntrospect(token: string): NexusIntrospectResponse {
    if (!token || token === "logged-out") {
      return { success: false, message: "Sessão inválida" };
    }
    return {
      success: true,
      data: {
        active: true,
        user: {
          id: "mock-admin-id",
          nome: "Administrador (Mock)",
          email: "admin@rarotickets.local",
          avatar_url: null,
        },
        role: { chave: "ADMINISTRADOR", nome: "Administrador" },
      },
    };
  }

  public static isValidRole(key: string): key is UserRole {
    return VALID_ROLES.includes(key as UserRole);
  }
}

export const nexusClient = new RaroNexusClient();
