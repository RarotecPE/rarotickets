import type {
  CertificateEmailConfig,
  CertificateLayoutConfig,
  CertificateRecipientVariables,
  CertificateSelectionConfig,
  CertificateWorkflowStatus,
} from "../certificates/services/certificate-text.domain-service";

export type CertificateReadModel = {
  id: string;
  authenticationCode: string;
  participantName: string;
  recipientEmail?: string;
  eventTitle: string;
  eventStartAt: Date;
  workloadHours: number;
  description: string;
  issuedAt: Date;
};

export type CertificateRenderableModel = {
  certificate: CertificateReadModel;
  eventId: string;
  responsibleName: string;
  templatePdfKey: string | null;
  layoutConfig: CertificateLayoutConfig | null;
  variables: CertificateRecipientVariables;
};

export type CertificateEventSummaryReadModel = {
  eventId: string;
  title: string;
  slug: string;
  modality: "presencial" | "online";
  startAt: Date;
  endAt: Date;
  workloadHours: number;
  workflowStatus: CertificateWorkflowStatus;
  templatePdfName: string | null;
  hasCustomTemplate: boolean;
  confirmedCount: number;
  checkedInCount: number;
  issuedCount: number;
  sentCount: number;
  failedCount: number;
  updatedAt: Date;
};

export type CertificatePresetReadModel = {
  id: string;
  name: string;
  templatePdfKey: string | null;
  templatePdfName: string | null;
  layoutConfig: CertificateLayoutConfig;
  emailConfig: CertificateEmailConfig | null;
  workloadHoursDefault: number | null;
  createdAt: Date;
};

export type CertificateHubCountsReadModel = {
  pendingEvents: number;
  completedEvents: number;
  dismissedEvents: number;
  totalIssued: number;
  totalSent: number;
};

export type CertificateHubReadModel = {
  events: CertificateEventSummaryReadModel[];
  presets: CertificatePresetReadModel[];
  counts: CertificateHubCountsReadModel;
};

export type CertificateWorkspaceRecipientReadModel = {
  recipientKey: string;
  source: "checkin" | "confirmado" | "extra" | "raronexus";
  registrationId: string | null;
  participantId: string | null;
  registrationCode: string | null;
  selected: boolean;
  name: string;
  originalName: string;
  email: string;
  cpf: string;
  company: string;
  jobTitle: string;
  hasCheckIn: boolean;
  checkInAt: Date | null;
  customVars: Record<string, string>;
  certificateId: string | null;
  authenticationCode: string | null;
  issuedAt: Date | null;
  emailStatus: "idle" | "sending" | "sent" | "failed";
  emailSentAt: Date | null;
  emailError: string | null;
};

export type CertificateWorkspaceEventInfo = {
  id: string;
  title: string;
  slug: string;
  modality: "presencial" | "online";
  startAt: Date;
  endAt: Date;
  status: string;
  responsibleName: string;
  responsibleEmail: string;
  workflowStatus: CertificateWorkflowStatus;
  workloadHours: number;
  certificateDescription: string;
  templatePdfKey: string | null;
  templatePdfName: string | null;
};

export type CertificateEventWorkspaceReadModel = {
  event: CertificateWorkspaceEventInfo;
  layoutConfig: CertificateLayoutConfig;
  emailConfig: CertificateEmailConfig;
  selectionConfig: CertificateSelectionConfig;
  recipients: CertificateWorkspaceRecipientReadModel[];
  availableVariables: string[];
  presets: CertificatePresetReadModel[];
};

export type CreateCertificatesParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  at: Date;
};

export type CertificateBatchResult = {
  created: number;
  existing: number;
};

export type ValidateCertificateParams = {
  code: string;
};

export type ListCertificateHubParams = {
  actorId: string;
  canViewAll: boolean;
  query?: string;
};

export type UpdateEventWorkflowStatusParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  workflowStatus: CertificateWorkflowStatus;
  at: Date;
};

export type GetEventCertificateWorkspaceParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
};

export type SaveEventCertificateWorkspaceParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  workloadHours?: number;
  certificateDescription?: string;
  templatePdfKey?: string | null;
  templatePdfName?: string | null;
  layoutConfig?: CertificateLayoutConfig;
  emailConfig?: CertificateEmailConfig;
  selectionConfig?: CertificateSelectionConfig;
  workflowStatus?: CertificateWorkflowStatus;
  at: Date;
};

export type IssueWorkspaceBatchParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  at: Date;
};

export type RecordRecipientEmailResultParams = {
  eventId: string;
  recipientKey: string;
  status: "sent" | "failed";
  messageId?: string | null;
  error?: string | null;
  at: Date;
};

export type ResetEventEmailStatusesParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  at: Date;
};

export type ListCertificatePresetsParams = {
  actorId: string;
  canViewAll: boolean;
};

export type CreateCertificatePresetParams = {
  name: string;
  templatePdfKey?: string | null;
  templatePdfName?: string | null;
  layoutConfig: CertificateLayoutConfig;
  emailConfig?: CertificateEmailConfig | null;
  workloadHoursDefault?: number | null;
  createdByGlobalUserId: string;
  at: Date;
};

export type DeleteCertificatePresetParams = {
  presetId: string;
  actorId: string;
  canViewAll: boolean;
};

export interface ICertificateRepository {
  issueEligible(params: CreateCertificatesParams): Promise<CertificateBatchResult>;
  findByCode(params: ValidateCertificateParams): Promise<CertificateReadModel | null>;
  findRenderableByCode(
    params: ValidateCertificateParams,
  ): Promise<CertificateRenderableModel | null>;
  findForRegistration(params: {
    registrationId: string;
  }): Promise<CertificateReadModel | null>;
  listCertificateHub(
    params: ListCertificateHubParams,
  ): Promise<CertificateHubReadModel>;
  updateEventWorkflowStatus(
    params: UpdateEventWorkflowStatusParams,
  ): Promise<CertificateEventSummaryReadModel | null>;
  getEventWorkspace(
    params: GetEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  saveEventWorkspace(
    params: SaveEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  issueWorkspaceBatch(
    params: IssueWorkspaceBatchParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  recordRecipientEmailResult(
    params: RecordRecipientEmailResultParams,
  ): Promise<void>;
  resetEventEmailStatuses(params: ResetEventEmailStatusesParams): Promise<void>;
  listPresets(
    params: ListCertificatePresetsParams,
  ): Promise<CertificatePresetReadModel[]>;
  createPreset(
    params: CreateCertificatePresetParams,
  ): Promise<CertificatePresetReadModel>;
  deletePreset(params: DeleteCertificatePresetParams): Promise<boolean>;
}

export abstract class CertificateRepository implements ICertificateRepository {
  abstract issueEligible(
    params: CreateCertificatesParams,
  ): Promise<CertificateBatchResult>;
  abstract findByCode(
    params: ValidateCertificateParams,
  ): Promise<CertificateReadModel | null>;
  abstract findRenderableByCode(
    params: ValidateCertificateParams,
  ): Promise<CertificateRenderableModel | null>;
  abstract findForRegistration(params: {
    registrationId: string;
  }): Promise<CertificateReadModel | null>;
  abstract listCertificateHub(
    params: ListCertificateHubParams,
  ): Promise<CertificateHubReadModel>;
  abstract updateEventWorkflowStatus(
    params: UpdateEventWorkflowStatusParams,
  ): Promise<CertificateEventSummaryReadModel | null>;
  abstract getEventWorkspace(
    params: GetEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  abstract saveEventWorkspace(
    params: SaveEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  abstract issueWorkspaceBatch(
    params: IssueWorkspaceBatchParams,
  ): Promise<CertificateEventWorkspaceReadModel | null>;
  abstract recordRecipientEmailResult(
    params: RecordRecipientEmailResultParams,
  ): Promise<void>;
  abstract resetEventEmailStatuses(
    params: ResetEventEmailStatusesParams,
  ): Promise<void>;
  abstract listPresets(
    params: ListCertificatePresetsParams,
  ): Promise<CertificatePresetReadModel[]>;
  abstract createPreset(
    params: CreateCertificatePresetParams,
  ): Promise<CertificatePresetReadModel>;
  abstract deletePreset(params: DeleteCertificatePresetParams): Promise<boolean>;
}
