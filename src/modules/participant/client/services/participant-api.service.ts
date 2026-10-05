import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type ConsentView = { type: string; version: string; accepted: boolean; acceptedAt: string | null };

export type ParticipantView = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  cpfFormatted: string | null;
  cnpj: string | null;
  phone: string | null;
  birthDate: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  consents: ConsentView[];
  createdAt: string;
  updatedAt: string;
};

export type OpenSessionRequest = { email?: string; cpf?: string };
export type ParticipantSessionResponse = { participant: ParticipantView; expiresAt: string };
export type ParticipantListParams = { search?: string; city?: string; state?: string; page?: number; perPage?: number };
export type ParticipantListResponse = { participants: ParticipantView[]; total: number };

/** Cadastro mestre do participante, sessão e consentimentos LGPD (§6, §41). */
export class ParticipantApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async openSession(request: OpenSessionRequest): Promise<ParticipantSessionResponse> {
    const response = await this.httpClient.post<ParticipantSessionResponse>('/participant/session', request);
    return response.data;
  }

  async closeSession(): Promise<void> {
    await this.httpClient.delete<void>('/participant/session');
  }

  /** O endpoint devolve o próprio participante (com os consentimentos dentro). */
  async currentParticipant(): Promise<ParticipantView> {
    const response = await this.httpClient.get<ParticipantView>('/participant/me');
    return response.data;
  }

  async updateProfile(body: Partial<ParticipantView>): Promise<{ participant: ParticipantView }> {
    const response = await this.httpClient.put<{ participant: ParticipantView }>('/participant/me', body);
    return response.data;
  }

  async registerConsents(
    consents: Array<{ type: string; version: string; accepted: boolean }>,
  ): Promise<{ consents: ConsentView[] }> {
    const response = await this.httpClient.post<{ consents: ConsentView[] }>('/participant/consents', { consents });
    return response.data;
  }

  async list(params: ParticipantListParams = {}): Promise<ParticipantListResponse> {
    const response = await this.httpClient.get<ParticipantView[]>('/admin/participants', {
      query: { search: params.search, city: params.city, state: params.state, page: params.page, perPage: params.perPage },
    });
    return { participants: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async detail(params: { participantId: string }): Promise<{ participant: ParticipantView }> {
    const response = await this.httpClient.get<{ participant: ParticipantView }>(
      `/admin/participants/${params.participantId}`,
    );
    return response.data;
  }
}
