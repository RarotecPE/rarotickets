import type { AppRole, Permission } from "@/modules/access/domain/services/role-permissions.domain-service";
import { ApiService, FetchHttpClient, type ApiServiceDependencies } from "@/client/services/api-service.base";

export type AuthUser = { id: string; nome: string; email: string; avatar_url: string | null };
export type ClientAuthSession = { role: AppRole; label: string; user: AuthUser; permissions: Permission[] };
export type SessionResponse = ClientAuthSession & { authenticated: boolean };
export type NexusApplication = { nome: string; client_id: string; logo_url: string | null; homepage_url: string };
export type ApplicationsResponse = { applications: NexusApplication[]; nexusProfileUrl: string };
export type LogoutResponse = { localSessionCleared: boolean; globalRevocationConfirmed: boolean };
export type AuthApiServiceDependencies = ApiServiceDependencies;

export class AuthApiService extends ApiService {
  constructor(dependencies: AuthApiServiceDependencies) { super(dependencies); }
  async getSession(): Promise<ClientAuthSession> {
    const response = await this.httpClient.request<SessionResponse>({ path: "/api/auth/session", method: "GET" });
    if (!response.data.authenticated || !response.data.user) throw new Error("Sessão RaroNexus inválida.");
    return response.data;
  }
  async getApplications(): Promise<ApplicationsResponse> {
    const response = await this.httpClient.request<ApplicationsResponse>({ path: "/api/auth/applications", method: "GET" });
    return response.data;
  }
  async logout(): Promise<LogoutResponse> {
    const response = await this.httpClient.request<LogoutResponse>({ path: "/api/auth/logout", method: "POST" });
    return response.data;
  }
}

const httpClient = new FetchHttpClient();
export const authApi = new AuthApiService({ httpClient });
