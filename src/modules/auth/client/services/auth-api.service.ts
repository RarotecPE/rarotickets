import { ApiService } from '../../../../client/services/api-service.base';
import type { ApiServiceDependencies } from '../../../../client/services/api-service.base';
import type { ApplicationCatalogResponse, AuthSessionResponse, AuthStatusResponse, LogoutResponse } from '../types/auth.types';

export type AuthApiServiceDependencies = ApiServiceDependencies;

export class AuthApiService extends ApiService {
  constructor(dependencies: AuthApiServiceDependencies) {
    super(dependencies);
  }

  getSession(): Promise<AuthSessionResponse> {
    return this.httpClient.request({ path: '/api/auth/session' });
  }

  getStatus(): Promise<AuthStatusResponse> {
    return this.httpClient.request({ path: '/api/auth/status' });
  }

  startDemo(): Promise<AuthSessionResponse> {
    return this.httpClient.request({ path: '/api/auth/demo', method: 'POST' });
  }

  getApplications(): Promise<ApplicationCatalogResponse> {
    return this.httpClient.request({ path: '/api/auth/applications' });
  }

  logout(): Promise<LogoutResponse> {
    return this.httpClient.request({ path: '/api/auth/logout', method: 'POST' });
  }
}
