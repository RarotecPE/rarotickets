import type {
  EventReadModel,
  ListPublicEventsParams,
  NewEventCoupon,
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
  CertificateEventSummaryReadModel,
  CertificateEventWorkspaceReadModel,
  CertificateHubReadModel,
  CertificatePresetReadModel,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type {
  CertificateEmailConfig,
  CertificateLayoutConfig,
  CertificateSelectionConfig,
  CertificateWorkflowStatus,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type {
  RaffleFilterType,
  RafflePrizeInput,
} from "@/modules/ticketing/domain/raffles/entities/raffle.entity";
import type {
  PublicRaffleView,
  RaffleActionType,
  RaffleDetail,
  RaffleSummary,
} from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import {
  ApiService,
  FetchHttpClient,
  type ApiServiceDependencies,
} from "@/client/services/api-service.base";

export type UpsertRaffleRequest = {
  title: string;
  description?: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners: boolean;
  animationDurationSeconds: number;
  prizes: RafflePrizeInput[];
  manualRegistrationIds: string[];
};

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
  paymentMode?: string | null;
  pixCode?: string | null;
  pixQrCodeUrl?: string | null;
  pixBankName?: string | null;
  pixBankAgency?: string | null;
  pixBankAccount?: string | null;
  pixBankAccountType?: string | null;
  pixBankCnpj?: string | null;
  pixBankAccountHolder?: string | null;
};
export type ValidateCouponClientRequest = {
  lotId: string;
  code: string;
  email?: string | null;
  cpf?: string | null;
};
export type ValidateCouponClientResult = {
  couponId: string;
  code: string;
  type: "percentual" | "valor_fixo";
  discountValue: number;
  originalCents: number;
  discountCents: number;
  finalCents: number;
};
export type ManagedEventListParams = { query?: string };
export type AdminRegistrationQuery = {
  eventId?: string;
  eventIds?: string[];
  query?: string;
  status?: string;
  checkInStatus?: string;
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
    Omit<EventReadModel["lots"][number], "id" | "soldCount" | "coupons"> & {
      id?: string;
      coupons?: NewEventCoupon[];
    }
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
  async validateCoupon(params: {
    slug: string;
    lotId: string;
    code: string;
    email?: string | null;
    cpf?: string | null;
  }): Promise<ValidateCouponClientResult> {
    return (
      await this.httpClient.request<ValidateCouponClientResult>({
        path: `/api/v1/events/${encodeURIComponent(params.slug)}/validate-coupon`,
        method: "POST",
        body: {
          lotId: params.lotId,
          code: params.code,
          email: params.email,
          cpf: params.cpf,
        },
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
  async uploadEventPixQr(params: { file: File }): Promise<string> {
    const formData = new FormData();
    formData.set("file", params.file);
    const result = await this.httpClient.request<{ pixQrCodeUrl: string }>({
      path: "/api/v1/admin/event-pix-qrcodes",
      method: "POST",
      body: formData,
    });
    return result.data.pixQrCodeUrl;
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
          checkInStatus: params.checkInStatus,
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
  async confirmManualPayment(params: {
    registrationId: string;
  }): Promise<{ registrationCode: string; status: string }> {
    return (
      await this.httpClient.request<{
        registrationCode: string;
        status: string;
      }>({
        path: `/api/v1/admin/registrations/${encodeURIComponent(params.registrationId)}/confirm-payment`,
        method: "POST",
      })
    ).data;
  }
  async extendRegistrationReservation(params: {
    registrationId: string;
    expiresAt: Date | string;
  }): Promise<{
    registrationCode: string;
    status: string;
    reservationExpiresAt: string;
  }> {
    return (
      await this.httpClient.request<{
        registrationCode: string;
        status: string;
        reservationExpiresAt: string;
      }>({
        path: `/api/v1/admin/registrations/${encodeURIComponent(params.registrationId)}/extend-reservation`,
        method: "POST",
        body: {
          expiresAt:
            params.expiresAt instanceof Date
              ? params.expiresAt.toISOString()
              : params.expiresAt,
        },
      })
    ).data;
  }
  async checkIn(params: {
    qrToken?: string;
    registrationCode?: string;
    reentry?: boolean;
    justification?: string;
  }): Promise<CheckInResponse> {
    return (
      await this.httpClient.request<CheckInResponse>({
        path: "/api/v1/admin/check-in",
        method: "POST",
        body: {
          qrToken: params.qrToken,
          registrationCode: params.registrationCode,
          reentry: Boolean(params.reentry),
          justification: params.justification,
        },
      })
    ).data;
  }
  async cancelCheckIn(params: {
    registrationId: string;
    checkInId?: string;
    reason?: string;
  }): Promise<{ registrationCode: string; cancelledCheckInId: string }> {
    return (
      await this.httpClient.request<{
        registrationCode: string;
        cancelledCheckInId: string;
      }>({
        path: `/api/v1/admin/registrations/${encodeURIComponent(params.registrationId)}/cancel-check-in`,
        method: "POST",
        body: {
          checkInId: params.checkInId,
          reason: params.reason,
        },
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

  async listEventRaffles(params: {
    eventId: string;
  }): Promise<RaffleSummary[]> {
    return (
      await this.httpClient.request<RaffleSummary[]>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles`,
        method: "GET",
      })
    ).data;
  }

  async getEventRaffle(params: {
    eventId: string;
    raffleId: string;
  }): Promise<RaffleDetail> {
    return (
      await this.httpClient.request<RaffleDetail>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles/${encodeURIComponent(params.raffleId)}`,
        method: "GET",
      })
    ).data;
  }

  async createEventRaffle(params: {
    eventId: string;
    request: UpsertRaffleRequest;
  }): Promise<RaffleDetail> {
    return (
      await this.httpClient.request<RaffleDetail>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles`,
        method: "POST",
        body: params.request,
      })
    ).data;
  }

  async updateEventRaffle(params: {
    eventId: string;
    raffleId: string;
    request: UpsertRaffleRequest;
  }): Promise<RaffleDetail> {
    return (
      await this.httpClient.request<RaffleDetail>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles/${encodeURIComponent(params.raffleId)}`,
        method: "PATCH",
        body: params.request,
      })
    ).data;
  }

  async deleteEventRaffle(params: {
    eventId: string;
    raffleId: string;
  }): Promise<{ deleted: boolean }> {
    return (
      await this.httpClient.request<{ deleted: boolean }>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles/${encodeURIComponent(params.raffleId)}`,
        method: "DELETE",
      })
    ).data;
  }

  async executeRaffleAction(params: {
    eventId: string;
    raffleId: string;
    action: RaffleActionType;
    prizeId?: string;
    reason?: string;
  }): Promise<RaffleDetail> {
    return (
      await this.httpClient.request<RaffleDetail>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/raffles/${encodeURIComponent(params.raffleId)}/action`,
        method: "POST",
        body: {
          action: params.action,
          prizeId: params.prizeId,
          reason: params.reason,
        },
      })
    ).data;
  }

  async getPublicRaffle(params: { token: string }): Promise<PublicRaffleView> {
    return (
      await this.httpClient.request<PublicRaffleView>({
        path: `/api/v1/public/raffles/${encodeURIComponent(params.token)}`,
        method: "GET",
      })
    ).data;
  }

  async listCertificateHub(
    params: { query?: string } = {},
  ): Promise<CertificateHubReadModel> {
    return (
      await this.httpClient.request<CertificateHubReadModel>({
        path: "/api/v1/admin/certificates",
        method: "GET",
        query: { q: params.query },
      })
    ).data;
  }

  async updateEventCertificateStatus(params: {
    eventId: string;
    workflowStatus: CertificateWorkflowStatus;
  }): Promise<CertificateEventSummaryReadModel> {
    return (
      await this.httpClient.request<CertificateEventSummaryReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificate-status`,
        method: "PATCH",
        body: { workflowStatus: params.workflowStatus },
      })
    ).data;
  }

  async getEventCertificateWorkspace(params: {
    eventId: string;
  }): Promise<CertificateEventWorkspaceReadModel> {
    return (
      await this.httpClient.request<CertificateEventWorkspaceReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificates/workspace`,
        method: "GET",
      })
    ).data;
  }

  async saveEventCertificateWorkspace(params: {
    eventId: string;
    workloadHours?: number;
    certificateDescription?: string;
    templatePdfKey?: string | null;
    templatePdfName?: string | null;
    layoutConfig?: CertificateLayoutConfig;
    emailConfig?: CertificateEmailConfig;
    selectionConfig?: CertificateSelectionConfig;
    workflowStatus?: CertificateWorkflowStatus;
    issueBatch?: boolean;
    resetEmailStatuses?: boolean;
  }): Promise<CertificateEventWorkspaceReadModel> {
    const { eventId, ...body } = params;
    return (
      await this.httpClient.request<CertificateEventWorkspaceReadModel>({
        path: `/api/v1/admin/events/${encodeURIComponent(eventId)}/certificates/workspace`,
        method: "PATCH",
        body,
      })
    ).data;
  }

  async uploadCertificateTemplate(params: {
    eventId: string;
    file: File;
  }): Promise<{ templatePdfKey: string; templatePdfName: string }> {
    const formData = new FormData();
    formData.set("file", params.file);
    return (
      await this.httpClient.request<{
        templatePdfKey: string;
        templatePdfName: string;
      }>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificates/template`,
        method: "POST",
        body: formData,
      })
    ).data;
  }

  async fetchCertificateTemplatePdfBytes(params: {
    eventId: string;
    key?: string;
  }): Promise<Uint8Array> {
    const query = params.key ? `?key=${encodeURIComponent(params.key)}` : "";
    const response = await fetch(
      `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificates/template${query}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Não foi possível carregar o PDF do modelo.");
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async sendCertificateEmail(params: {
    eventId: string;
    recipientKey?: string;
    testRecipient?: string;
  }): Promise<{
    sent: boolean;
    toEmail: string;
    authenticationCode: string;
    attachmentFilename: string;
    sentAt: string;
  }> {
    return (
      await this.httpClient.request<{
        sent: boolean;
        toEmail: string;
        authenticationCode: string;
        attachmentFilename: string;
        sentAt: string;
      }>({
        path: `/api/v1/admin/events/${encodeURIComponent(params.eventId)}/certificates/send`,
        method: "POST",
        body: {
          recipientKey: params.recipientKey,
          testRecipient: params.testRecipient,
        },
      })
    ).data;
  }

  async createCertificatePreset(params: {
    name: string;
    templatePdfKey?: string | null;
    templatePdfName?: string | null;
    layoutConfig: CertificateLayoutConfig;
    emailConfig?: CertificateEmailConfig | null;
    workloadHoursDefault?: number | null;
  }): Promise<CertificatePresetReadModel> {
    return (
      await this.httpClient.request<CertificatePresetReadModel>({
        path: "/api/v1/admin/certificate-presets",
        method: "POST",
        body: params,
      })
    ).data;
  }

  async deleteCertificatePreset(params: {
    presetId: string;
  }): Promise<{ deleted: boolean }> {
    return (
      await this.httpClient.request<{ deleted: boolean }>({
        path: `/api/v1/admin/certificate-presets/${encodeURIComponent(params.presetId)}`,
        method: "DELETE",
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
