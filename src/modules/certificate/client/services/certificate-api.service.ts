import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type CertificateView = {
  id: string;
  code: string;
  registrationId: string;
  participantId: string;
  eventId: string;
  participantName: string;
  participantCpf: string | null;
  eventTitle: string;
  workloadHours: number;
  activitiesSummary: string | null;
  status: string;
  issuedAt: string;
  issuedBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  validationUrl: string;
};

export type CertificateValidationView = {
  valid: boolean;
  code: string;
  status: string;
  participantName: string | null;
  eventTitle: string | null;
  workloadHours: number;
  issuedAt: string | null;
  cancelledAt: string | null;
  message: string;
};

export type CertificateListParams = { eventId?: string; participantId?: string; search?: string; page?: number; perPage?: number };

/** Emissão, revogação e validação pública de certificados (§30, §31). */
export class CertificateApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async validate(code: string): Promise<CertificateValidationView> {
    const response = await this.httpClient.get<CertificateValidationView>(`/certificates/${code}/validate`);
    return response.data;
  }

  async detail(code: string): Promise<{ certificate: CertificateView }> {
    const response = await this.httpClient.get<{ certificate: CertificateView }>(`/certificates/${code}`);
    return response.data;
  }

  async listMine(): Promise<{ certificates: CertificateView[] }> {
    const response = await this.httpClient.get<CertificateView[]>('/participant/certificates');
    return { certificates: response.data };
  }

  async listAdmin(params: CertificateListParams = {}): Promise<{ certificates: CertificateView[]; total: number }> {
    const response = await this.httpClient.get<CertificateView[]>('/admin/certificates', {
      query: {
        eventId: params.eventId,
        participantId: params.participantId,
        search: params.search,
        page: params.page,
        perPage: params.perPage ?? 30,
      },
    });
    return { certificates: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async issue(registrationId: string): Promise<{ certificate: CertificateView; alreadyIssued: boolean }> {
    const response = await this.httpClient.post<{ certificate: CertificateView; alreadyIssued: boolean }>(
      `/admin/registrations/${registrationId}/certificate`,
      {},
    );
    return response.data;
  }

  async revoke(certificateId: string, reason: string): Promise<{ certificate: CertificateView }> {
    const response = await this.httpClient.post<{ certificate: CertificateView }>(
      `/admin/certificates/${certificateId}/revoke`,
      { reason },
    );
    return response.data;
  }
}
