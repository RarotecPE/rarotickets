import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
};

export type LoginRequest = { email: string; password: string };
export type CurrentUserResponse = { user: AuthUser };

/** Serviço de autenticação de usuários internos (§35). */
export class AuthApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async login(request: LoginRequest): Promise<CurrentUserResponse> {
    const response = await this.httpClient.post<CurrentUserResponse>('/auth/login', request);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.httpClient.post<void>('/auth/logout');
  }

  async currentUser(): Promise<CurrentUserResponse> {
    const response = await this.httpClient.get<CurrentUserResponse>('/auth/me');
    return response.data;
  }
}
