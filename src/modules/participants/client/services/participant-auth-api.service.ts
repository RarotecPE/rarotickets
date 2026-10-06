import { ApiService } from '../../../../client/services/api-service.base';
import type { ApiServiceDependencies } from '../../../../client/services/api-service.base';
import type {
  LoginParticipantRequest,
  LoginParticipantResponse,
  ParticipantLogoutResponse,
  ParticipantSessionResponse,
  RegisterParticipantRequest,
  RegisterParticipantResponse,
} from '../types/participant.types';

export type ParticipantAuthApiServiceDependencies = ApiServiceDependencies;

export class ParticipantAuthApiService extends ApiService {
  constructor(dependencies: ParticipantAuthApiServiceDependencies) {
    super(dependencies);
  }

  getSession(): Promise<ParticipantSessionResponse> {
    return this.httpClient.request({ path: '/api/participants/auth/session' });
  }

  register(params: RegisterParticipantRequest): Promise<RegisterParticipantResponse> {
    return this.httpClient.request({ path: '/api/participants/auth/register', method: 'POST', body: params });
  }

  login(params: LoginParticipantRequest): Promise<LoginParticipantResponse> {
    return this.httpClient.request({ path: '/api/participants/auth/login', method: 'POST', body: params });
  }

  logout(): Promise<ParticipantLogoutResponse> {
    return this.httpClient.request({ path: '/api/participants/auth/logout', method: 'POST' });
  }
}
