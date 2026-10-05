import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type RegistrationAnswerView = {
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  value: string | null;
  displayValue: string;
};

export type RegistrationView = {
  id: string;
  code: string;
  eventId: string;
  participantId: string;
  loteId: string | null;
  loteName: string | null;
  status: string;
  statusLabel: string;
  seatStatus: string;
  priceCents: number;
  priceFormatted: string;
  discountCents: number;
  discountFormatted: string;
  finalAmountCents: number;
  finalAmountFormatted: string;
  couponCode: string | null;
  isCourtesy: boolean;
  courtesyReason: string | null;
  paymentMethod: string | null;
  waitlistPosition: number | null;
  reservationExpiresAt: string | null;
  formVersion: number;
  answers: RegistrationAnswerView[];
  checkInAt: string | null;
  hasCheckedIn: boolean;
  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  participantName?: string | null;
  participantEmail?: string | null;
  eventTitle?: string | null;
};

export type RegistrationDetailResponse = {
  registration: RegistrationView;
  participant: { id: string; name: string; email: string; cpf: string | null } | null;
  event: { id: string; title: string; slug: string; type: string; status: string } | null;
  credential: { code: string; token: string; credentialUrl: string } | null;
};

export type CredentialResponse = {
  code: string;
  token: string;
  qrPayload: string;
  credentialUrl: string;
  eventTitle: string | null;
  participantName: string | null;
};

export type CheckInRecordView = {
  registrationId: string;
  eventId: string;
  checkedInAt: string;
  operatorName: string | null;
  method: string;
  isOverride: boolean;
  overrideReason: string | null;
};

export type PerformCheckInResponse = {
  registration: RegistrationView;
  participantName: string | null;
  eventTitle: string | null;
  checkedInAt: string;
  isOverride: boolean;
};

export type RegistrationAdminListResponse = { registrations: RegistrationView[]; total: number };

export type RegistrationFormFieldAnswer = { fieldKey: string; value: string | null };

export type RegisterForEventRequest = {
  eventId?: string | null;
  eventSlug?: string | null;
  participant: {
    name: string;
    email: string;
    cpf: string;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    company?: string | null;
    jobTitle?: string | null;
  };
  answers: RegistrationFormFieldAnswer[];
  consents: { termsVersion: string; privacyVersion: string; marketingAccepted: boolean };
  couponCode?: string | null;
};

export type RegisterForEventResponse = {
  registration: RegistrationView;
  participant: { id: string; name: string; email: string };
  event: { id: string; title: string; slug: string; type: string; status: string };
  requiresPayment: boolean;
  waitlisted: boolean;
  paymentOptions: {
    allowPix: boolean;
    allowBoleto: boolean;
    allowCreditCard: boolean;
    maxInstallments: number;
    minInstallmentCents: number;
    reservationExpiresAt: string | null;
  };
};

export type AdminRegistrationListParams = {
  eventId?: string;
  status?: string;
  search?: string;
  includingCancelled?: boolean;
  page?: number;
  perPage?: number;
};

/** Inscrições, credenciais e check-in (§7–§12, §25, §28–§30). */
export class RegistrationApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async register(request: RegisterForEventRequest): Promise<RegisterForEventResponse> {
    const response = await this.httpClient.post<RegisterForEventResponse>('/registrations', request);
    return response.data;
  }

  async getByCode(code: string): Promise<RegistrationDetailResponse> {
    const response = await this.httpClient.get<RegistrationDetailResponse>(`/registrations/${code}`);
    return response.data;
  }

  async credential(code: string): Promise<CredentialResponse> {
    const response = await this.httpClient.get<CredentialResponse>(`/registrations/${code}/credential`);
    return response.data;
  }

  /** Credencial do próprio participante, por token de sessão (cookie). */
  async credentialByCode(code: string): Promise<CredentialResponse> {
    return this.credential(code);
  }

  async listMine(): Promise<{ registrations: RegistrationView[] }> {
    const response = await this.httpClient.get<RegistrationView[]>('/participant/registrations');
    return { registrations: response.data };
  }

  async cancelMine(params: { code: string; reason: string }): Promise<RegistrationDetailResponse> {
    const response = await this.httpClient.post<RegistrationDetailResponse>(
      `/participant/registrations/${params.code}/cancel`,
      { reason: params.reason },
    );
    return response.data;
  }

  async listAdmin(params: AdminRegistrationListParams = {}): Promise<RegistrationAdminListResponse> {
    const response = await this.httpClient.get<RegistrationView[]>('/admin/registrations', {
      query: {
        eventId: params.eventId,
        status: params.status,
        search: params.search,
        includingCancelled: params.includingCancelled ? 'true' : undefined,
        page: params.page,
        perPage: params.perPage ?? 20,
      },
    });
    return { registrations: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async detailAdmin(registrationId: string): Promise<RegistrationDetailResponse> {
    const response = await this.httpClient.get<RegistrationDetailResponse>(`/admin/registrations/${registrationId}`);
    return response.data;
  }

  async cancelAdmin(params: { registrationId: string; reason: string }): Promise<RegistrationDetailResponse> {
    const response = await this.httpClient.post<RegistrationDetailResponse>(
      `/admin/registrations/${params.registrationId}/cancel`,
      { reason: params.reason },
    );
    return response.data;
  }

  async promote(params: { registrationId: string }): Promise<RegistrationDetailResponse> {
    const response = await this.httpClient.post<RegistrationDetailResponse>(
      `/admin/registrations/${params.registrationId}/promote`,
    );
    return response.data;
  }

  async performCheckIn(params: {
    code?: string | null;
    credentialToken?: string | null;
    override?: boolean;
    overrideReason?: string | null;
  }): Promise<PerformCheckInResponse> {
    const response = await this.httpClient.post<PerformCheckInResponse>('/check-in', params);
    return response.data;
  }

  async checkInByRegistration(params: {
    registrationId: string;
    override?: boolean;
    overrideReason?: string | null;
  }): Promise<PerformCheckInResponse> {
    const response = await this.httpClient.post<PerformCheckInResponse>(
      `/admin/registrations/${params.registrationId}/check-in`,
      { override: params.override ?? false, overrideReason: params.overrideReason ?? null },
    );
    return response.data;
  }

  async listCheckIns(eventId: string): Promise<{ checkIns: CheckInRecordView[] }> {
    const response = await this.httpClient.get<CheckInRecordView[]>(`/admin/events/${eventId}/check-ins`);
    return { checkIns: response.data };
  }

  async expireReservations(): Promise<{ expired: number }> {
    const response = await this.httpClient.post<{ expired: number }>('/admin/registrations/expire-reservations', {});
    return response.data;
  }
}
