import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';
import type { AuthUser } from './auth-api.service';

export type UserListParams = { search?: string; role?: string; page?: number; perPage?: number };
export type UserListResponse = { users: AuthUser[]; total: number };
export type CreateUserRequest = { name: string; email: string; password: string; role: string; permissions?: string[] };
export type UpdateUserRequest = {
  name?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
  password?: string;
};

/** Gestão de usuários internos, perfis e permissões (§35). */
export class UserApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async list(params: UserListParams = {}): Promise<UserListResponse> {
    const response = await this.httpClient.get<AuthUser[]>('/users', {
      query: {
        search: params.search,
        role: params.role,
        page: params.page,
        perPage: params.perPage,
      },
    });
    return { users: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async create(request: CreateUserRequest): Promise<{ user: AuthUser }> {
    const response = await this.httpClient.post<{ user: AuthUser }>('/users', request);
    return response.data;
  }

  async update(params: { userId: string; body: UpdateUserRequest }): Promise<{ user: AuthUser }> {
    const response = await this.httpClient.put<{ user: AuthUser }>(`/users/${params.userId}`, params.body);
    return response.data;
  }
}
