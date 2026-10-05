import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type EventLoteView = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  maxQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  priceCents: number;
  priceFormatted: string;
  isActive: boolean;
  orderIndex: number;
};

export type EventFormFieldView = {
  id: string;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  fieldTypeLabel: string;
  isRequired: boolean;
  orderIndex: number;
  options: string[];
  placeholder: string | null;
  isActive: boolean;
};

export type EventSpeakerView = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  institution: string | null;
  orderIndex: number;
};

export type EventActivityView = {
  id: string;
  title: string;
  description: string | null;
  speakerId: string | null;
  speakerName: string | null;
  startAt: string;
  endAt: string;
  room: string | null;
  orderIndex: number;
};

export type EventSeatUsageView = {
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistCount: number;
  availableSeats: number;
};

export type EventSummaryView = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
  isOnline: boolean;
  onlineUrl: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  locationLabel: string;
  capacity: number;
  registrationStart: string;
  registrationEnd: string;
  type: string;
  status: string;
  statusLabel: string;
  workloadHours: number;
  certificateEnabled: boolean;
  certificateText: string | null;
  certificateRequiresAttendance: boolean;
  waitlistEnabled: boolean;
  waitlistAutoPromote: boolean;
  seatReservationMinutes: number;
  maxInstallments: number;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  minInstallmentCents: number;
  responsibleName: string;
  createdAt: string;
  updatedAt: string;
};

export type ListedEventView = EventSummaryView & { seatUsage: EventSeatUsageView; isRegistrationOpen: boolean };

export type AdminEventResponse = {
  event: EventSummaryView & { formVersion: number };
  seatUsage: EventSeatUsageView;
  lotes: EventLoteView[];
  formFields: EventFormFieldView[];
  speakers: EventSpeakerView[];
  activities: EventActivityView[];
};

export type PublicEventResponse = {
  event: EventSummaryView;
  seatUsage: EventSeatUsageView;
  lotes: EventLoteView[];
  currentLote: EventLoteView | null;
  formFields: EventFormFieldView[];
  speakers: EventSpeakerView[];
  activities: EventActivityView[];
  consents: Array<{ type: string; version: string; required: boolean }>;
  isRegistrationOpen: boolean;
  waitlistEnabled: boolean;
};

export type EventListParams = {
  search?: string;
  status?: string;
  type?: string;
  city?: string;
  state?: string;
  page?: number;
  perPage?: number;
  onlyPublic?: boolean;
};

export type EventListResponse = { events: ListedEventView[]; total: number };

/** Eventos, lotes, formulários e programação (§2–§5, §32, §33). */
export class EventApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async listPublic(params: EventListParams = {}): Promise<EventListResponse> {
    const response = await this.httpClient.get<ListedEventView[]>('/events', {
      query: {
        search: params.search,
        city: params.city,
        state: params.state,
        page: params.page,
        perPage: params.perPage ?? 24,
      },
    });
    return { events: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async getPublic(slug: string): Promise<PublicEventResponse> {
    const response = await this.httpClient.get<PublicEventResponse>(`/events/${slug}`);
    return response.data;
  }

  async listAdmin(params: EventListParams = {}): Promise<EventListResponse> {
    const response = await this.httpClient.get<ListedEventView[]>('/admin/events', {
      query: {
        search: params.search,
        status: params.status,
        type: params.type,
        page: params.page,
        perPage: params.perPage ?? 20,
      },
    });
    return { events: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async getAdmin(eventId: string): Promise<AdminEventResponse> {
    const response = await this.httpClient.get<AdminEventResponse>(`/admin/events/${eventId}`);
    return response.data;
  }

  async create(body: Record<string, unknown>): Promise<{ event: EventSummaryView }> {
    const response = await this.httpClient.post<{ event: EventSummaryView }>('/admin/events', body);
    return response.data;
  }

  /** O contrato de atualização recebe apenas os campos alterados dentro de `fields`. */
  async update(eventId: string, fields: Record<string, unknown>): Promise<{ event: EventSummaryView }> {
    const response = await this.httpClient.put<{ event: EventSummaryView }>(`/admin/events/${eventId}`, { fields });
    return response.data;
  }

  async changeStatus(params: { eventId: string; nextStatus: string; reason?: string | null }): Promise<unknown> {
    const response = await this.httpClient.post<unknown>(`/admin/events/${params.eventId}/status`, {
      nextStatus: params.nextStatus,
      reason: params.reason ?? null,
    });
    return response.data;
  }

  /** Reenvia a lista completa de campos: o domínio versiona e preserva as respostas antigas. */
  async saveForm(params: { eventId: string; fields: Array<Record<string, unknown>> }): Promise<{ formVersion: number; fields: EventFormFieldView[] }> {
    const response = await this.httpClient.put<{ formVersion: number; fields: EventFormFieldView[] }>(
      `/admin/events/${params.eventId}/form`,
      { fields: params.fields },
    );
    return response.data;
  }

  async saveLote(params: { eventId: string; body: Record<string, unknown> }): Promise<unknown> {
    const response = await this.httpClient.post<unknown>(`/admin/events/${params.eventId}/lotes`, params.body);
    return response.data;
  }

  async saveProgram(params: { eventId: string; body: Record<string, unknown> }): Promise<unknown> {
    const response = await this.httpClient.post<unknown>(`/admin/events/${params.eventId}/program`, params.body);
    return response.data;
  }
}
