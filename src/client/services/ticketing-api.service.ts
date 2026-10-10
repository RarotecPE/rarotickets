import type {
  EventReadModel,
  ListPublicEventsParams,
} from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type {
  ParticipantInput,
  ParticipantPortalView,
  RegistrationListResult,
  PaymentWebhookUpdateResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type {
  DashboardMetrics,
  ReportParams,
  RevenueReport,
} from "@/modules/ticketing/domain/repositories/reporting-repository.interface";
import type {
  CertificateReadModel,
  CertificateBatchResult,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import {
  ApiService,
  FetchHttpClient,
  type ApiServiceDependencies,
} from "@/client/services/api-service.base";

export type PublicRegistrationFile = { fieldId: string; file: File };
export type PublicRegistrationRequest = {
  participant: ParticipantInput;
  answers: Record<string, unknown>;
  lotId: string | null;
  couponCode: string | null;
  files?: PublicRegistrationFile[];
};
export type PublicRegistrationResult = {
  registrationId: string;
  registrationCode: string;
  status: string;
  finalCents: number;
  reservationExpiresAt: Date | null;
  participantUrl: string;
  checkoutUrl: string | null;
  credentialUrl: string | null;
  eventTitle: string;
  accessToken?: string;
};
export type ManagedEventListParams = { query?: string };
export type AdminRegistrationQuery = {
  eventId?: string;
  eventIds?: string[];
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};
export type PaginatedAuditLogs = {
  items: Array<{
    id: string;
    userId: string;
    userName: string;
    action: string;
    entity: string;
    recordId: string;
    beforeData: Record<string, unknown> | null;
    afterData: Record<string, unknown> | null;
    ip: string | null;
    createdAt: Date;
  }>;
  total: number;
};
export type CreateEventRequest = Omit<
  EventReadModel["props"],
  "status" | "createdByGlobalUserId" | "deletedAt"
> & {
  lots: Array<
    Omit<EventReadModel["lots"][number], "id" | "soldCount"> & { id?: string }
  >;
  fields: Array<Omit<EventReadModel["formFields"][number], "id"> & { id?: string }>;
  activities: Array<
    Omit<EventReadModel["activities"][number], "id"> & { id?: string }
  >;
};
export type StartCheckoutResponse = { checkoutUrl: string; expiresAt: Date };
export type MockPaymentStatus = "pago" | "recusado" | "cancelado";
export type UploadEventBannerParams = { file: File };
export type CheckInResponse = {
  accepted: boolean;
  registrationCode: string;
  participantName: string;
  eventTitle: string;
  happenedAt: Date;
  operatorName: string;
  reason: string | null;
  previousCheckInAt: Date | null;
};
export type ApiMessageResponse = { message?: string };
export type TicketingApiServiceDependencies = ApiServiceDependencies;

export class TicketingApiService extends ApiService {
  constructor(dependencies: TicketingApiServiceDependencies) {
    super(dependencies);
  }
  async listPublicEvents(
    params: ListPublicEventsParams,
  ): Promise<EventReadModel[]> {
    return (
      await this.httpClient.request<EventReadModel[]>({
        path: "/api/v1/events",
        method: "GET",
        query: {
          q: params.query,
          modality: params.modality,
          limit: params.limit,
        },
      })
    ).data;
  }
  async getPublicEvent(params: { slug: string }): Promise<EventReadModel> {
    return (
      await this.httpClient.request<EventReadModel>({
        path: `/api/v1/events/${encodeURIComponent(params.slug)}`,
        method: "GET",
      })
    ).data;
  }
  async createPublicRegistration(params: {
    slug: string;
    request: PublicRegistrationRequest;
  }): Promise<PublicRegistrationResult> {
    const { files = [], ...registration } = params.request;
    const body = files.length
      ? createPublicRegistrationFormData({ registration, files })
      : registration;
    return (
      await this.httpClient.request<PublicRegistrationResult>({
        path: `/api/v1/events/${encodeURIComponent(params.slug)}/registrations`,
        method: "POST",
        body,
      })
    ).data;
  }
  async listManagedEvents(
    params: ManagedEventListParams = {},
  ): Promise<EventReadModel[]> {
    return (
      await this.httpClient.request<EventReadModel[]>({
        path: "/api/v1/admin/events",
        method: "GET",
        query: { q: params.query },
      })
    ).data;
  }
  async createEvent(params: {
    request: CreateEventRequest;
  }): Promise<EventReadModel> {
    return (
      await this.httpClient.request<EventReadModel>({
        path: "/api/v1/admin/events",
        method: "POST",
        body: params.request,
      })
    ).data;
  }
  async uploadEventBanner(params: UploadEventBannerParams): Promise<string> {
    const formData = new FormData();
    formData.set("file", params.file);
    const result = await this.httpClient.request<{ bannerUrl: string }>({
      path: "/api/v1/admin/event-banners",
      method: "POST",
      body: formData,
    });
    return result.data.bannerUrl;
  }
  async getManagedEvent(params: { eventId: string }): Promise<EventReadModel> {
    return (
      await this.httpClient.request<EventReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}`,
        method: "GET",
      })
    ).data;
  }
  async updateEvent(params: {
    eventId: string;
    request: CreateEventRequest;
  }): Promise<EventReadModel> {
    return (
      await this.httpClient.request<EventReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}`,
        method: "PATCH",
        body: params.request,
      })
    ).data;
  }
  async transitionEvent(params: {
    eventId: string;
    nextStatus: string;
    justification?: string;
  }): Promise<EventReadModel> {
    return (
      await this.httpClient.request<EventReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/status`,
        method: "PATCH",
        body: {
          nextStatus: params.nextStatus,
          justification: params.justification,
        },
      })
    ).data;
  }
  async getDashboard(): Promise<DashboardMetrics> {
    return (
      await this.httpClient.request<DashboardMetrics>({
        path: "/api/v1/admin/dashboard",
        method: "GET",
      })
    ).data;
  }
  async listRegistrations(
    params: AdminRegistrationQuery = {},
  ): Promise<RegistrationListResult> {
    return (
      await this.httpClient.request<RegistrationListResult>({
        path: "/api/v1/admin/registrations",
        method: "GET",
        query: {
          eventId: params.eventId,
          eventIds: params.eventIds?.length
            ? params.eventIds.join(",")
            : undefined,
          q: params.query,
          status: params.status,
          page: params.page,
          pageSize: params.pageSize,
        },
      })
    ).data;
  }
  async cancelRegistration(params: {
    registrationId: string;
    reason: string;
  }): Promise<ApiMessageResponse> {
    return (
      await this.httpClient.request<ApiMessageResponse>({
        path: `/api/v1/admin/registrations/${encodeURIComponent(params.registrationId)}/cancel`,
        method: "POST",
        body: { reason: params.reason },
      })
    ).data;
  }
  async checkIn(params: {
    qrToken: string;
    reentry: boolean;
    justification?: string;
  }): Promise<CheckInResponse> {
    return (
      await this.httpClient.request<CheckInResponse>({
        path: "/api/v1/admin/check-in",
        method: "POST",
        body: params,
      })
    ).data;
  }
  async getReport(
    params: Pick<ReportParams, "eventId" | "from" | "to">,
  ): Promise<RevenueReport> {
    return (
      await this.httpClient.request<RevenueReport>({
        path: "/api/v1/admin/reports",
        method: "GET",
        query: {
          eventId: params.eventId,
          from: params.from?.toISOString(),
          to: params.to?.toISOString(),
        },
      })
    ).data;
  }
  async issueCertificates(params: {
    eventId: string;
  }): Promise<CertificateBatchResult> {
    return (
      await this.httpClient.request<CertificateBatchResult>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificates`,
        method: "POST",
      })
    ).data;
  }
  async getCertificate(params: {
    code: string;
  }): Promise<CertificateReadModel> {
    return (
      await this.httpClient.request<CertificateReadModel>({
        path: `/api/v1/certificates/${encodeURIComponent(params.code)}`,
        method: "GET",
      })
    ).data;
  }
  async getParticipantPortal(params: {
    accessToken: string;
  }): Promise<ParticipantPortalView> {
    return (
      await this.httpClient.request<ParticipantPortalView>({
        path: `/api/v1/participant/${encodeURIComponent(params.accessToken)}`,
        method: "GET",
      })
    ).data;
  }
  async startParticipantCheckout(params: {
    accessToken: string;
  }): Promise<StartCheckoutResponse> {
    return (
      await this.httpClient.request<StartCheckoutResponse>({
        path: `/api/v1/participant/${encodeURIComponent(params.accessToken)}/checkout`,
        method: "POST",
      })
    ).data;
  }
  async simulateMockPayment(params: {
    referenceId: string;
    status: MockPaymentStatus;
  }): Promise<PaymentWebhookUpdateResult> {
    return (
      await this.httpClient.request<PaymentWebhookUpdateResult>({
        path: "/api/mock/payment",
        method: "POST",
        body: params,
      })
    ).data;
  }
  async getAuditLog(params: {
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedAuditLogs> {
    return (
      await this.httpClient.request<PaginatedAuditLogs>({
        path: "/api/v1/admin/audit",
        method: "GET",
        query: {
          q: params.query,
          page: params.page,
          pageSize: params.pageSize,
        },
      })
    ).data;
  }
}

const httpClient = new FetchHttpClient();
export const ticketingApi = new TicketingApiService({ httpClient });

type CreatePublicRegistrationFormDataParams = {
  registration: Omit<PublicRegistrationRequest, "files">;
  files: PublicRegistrationFile[];
};
function createPublicRegistrationFormData(
  params: CreatePublicRegistrationFormDataParams,
): FormData {
  const formData = new FormData();
  formData.set("participant", JSON.stringify(params.registration.participant));
  formData.set("answers", JSON.stringify(params.registration.answers));
  formData.set("lotId", params.registration.lotId ?? "");
  formData.set("couponCode", params.registration.couponCode ?? "");
  for (const item of params.files)
    formData.append(`file:${item.fieldId}`, item.file);
  return formData;
}
