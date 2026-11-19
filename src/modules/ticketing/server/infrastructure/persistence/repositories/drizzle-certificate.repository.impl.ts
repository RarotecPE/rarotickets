import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  DEFAULT_CERTIFICATE_EMAIL_CONFIG,
  DEFAULT_CERTIFICATE_LAYOUT_CONFIG,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type {
  CertificateEmailConfig,
  CertificateEmailExtraAttachment,
  CertificateLayoutConfig,
  CertificateSelectionConfig,
  CertificateWorkflowStatus,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type {
  CertificateBatchResult,
  CertificateEventSummaryReadModel,
  CertificateEventWorkspaceReadModel,
  CertificateHubReadModel,
  CertificatePresetReadModel,
  CertificateReadModel,
  CertificateRenderableModel,
  CertificateWorkspaceRecipientReadModel,
  CreateCertificatePresetParams,
  CreateCertificatesParams,
  DeleteCertificatePresetParams,
  GetEventCertificateWorkspaceParams,
  IssueWorkspaceBatchParams,
  ListCertificateHubParams,
  RecordRecipientEmailResultParams,
  ResetEventEmailStatusesParams,
  SaveEventCertificateWorkspaceParams,
  UpdateEventWorkflowStatusParams,
  ValidateCertificateParams,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import { CertificateEligibilityDomainService } from "@/modules/ticketing/domain/services/certificate-eligibility.domain-service";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import {
  certificates,
  checkins,
  eventFormFields,
  events,
  outboxMessages,
  participants,
  registrations,
} from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleCertificateRepositoryDependencies = {
  database: Database;
  credentialProvider: ICredentialProvider;
};

type CertificateCandidate = {
  registrationId: string;
  registrationStatus: string;
  eventId: string;
  eventStatus: string;
  eventTitle: string;
  eventStartAt: Date;
  workloadHours: number;
  certificateEnabled: boolean;
  description: string | null;
  participantId: string;
  participantName: string;
  checkInId: string | null;
  certificateId: string | null;
};

type StoredWorkspacePayload = {
  workflowStatus?: CertificateWorkflowStatus;
  templatePdfKey?: string | null;
  templatePdfName?: string | null;
  layoutConfig?: CertificateLayoutConfig;
  emailConfig?: CertificateEmailConfig;
  selectionConfig?: CertificateSelectionConfig;
};

type StoredExtraCertPayload = {
  id: string;
  eventId: string;
  recipientKey: string;
  authenticationCode: string;
  participantName: string;
  recipientEmail: string;
  recipientCpf: string;
  workloadHours: number;
  descriptionSnapshot: string;
  eventTitleSnapshot: string;
  eventStartSnapshot: string;
  issuedAt: string;
  customVars: Record<string, string>;
};

const CHANNEL_WORKSPACE = "cert_workspace";
const CHANNEL_EMAIL_STATUS = "cert_email";
const CHANNEL_PRESET = "cert_preset";
const CHANNEL_EXTRA_CERT = "cert_extra";

export class DrizzleCertificateRepository extends CertificateRepository {
  private readonly database: Database;
  private readonly credentialProvider: ICredentialProvider;
  private readonly eligibilityService: CertificateEligibilityDomainService;

  constructor(dependencies: DrizzleCertificateRepositoryDependencies) {
    super();
    this.database = dependencies.database;
    this.credentialProvider = dependencies.credentialProvider;
    this.eligibilityService = new CertificateEligibilityDomainService();
  }

  async issueEligible(
    params: CreateCertificatesParams,
  ): Promise<CertificateBatchResult> {
    const candidates = await this.database
      .select({
        registrationId: registrations.id,
        registrationStatus: registrations.status,
        eventId: events.id,
        eventStatus: events.status,
        eventTitle: events.title,
        eventStartAt: events.startAt,
        workloadHours: events.workloadHours,
        certificateEnabled: events.certificateEnabled,
        description: events.certificateDescription,
        participantId: participants.id,
        participantName: participants.name,
        checkInId: checkins.id,
        certificateId: certificates.id,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(
        checkins,
        and(
          eq(registrations.id, checkins.registrationId),
          eq(checkins.type, "normal"),
        ),
      )
      .leftJoin(
        certificates,
        eq(registrations.id, certificates.registrationId),
      )
      .where(
        and(
          eq(events.id, params.eventId),
          isNull(events.deletedAt),
          isNull(registrations.deletedAt),
        ),
      );

    const domainEligible = candidates.filter((candidate) =>
      this.isEligible(candidate),
    );
    const missing = domainEligible.filter(
      (candidate) => candidate.certificateId === null,
    );
    if (!missing.length) {
      return { created: 0, existing: domainEligible.length };
    }

    const values = missing.map((candidate) => ({
      registrationId: candidate.registrationId,
      eventId: candidate.eventId,
      participantId: candidate.participantId,
      authenticationCode: this.credentialProvider.issueCertificateCode({
        year: params.at.getUTCFullYear(),
      }),
      workloadHours: Math.max(1, candidate.workloadHours || 8),
      descriptionSnapshot:
        candidate.description ||
        `Participou do evento ${candidate.eventTitle}.`,
      eventTitleSnapshot: candidate.eventTitle,
      participantNameSnapshot: candidate.participantName,
      eventStartSnapshot: candidate.eventStartAt,
      issuedAt: params.at,
      createdAt: params.at,
    }));

    const inserted = await this.database
      .insert(certificates)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: certificates.id });

    return {
      created: inserted.length,
      existing: domainEligible.length - inserted.length,
    };
  }

  async findByCode(
    params: ValidateCertificateParams,
  ): Promise<CertificateReadModel | null> {
    const normalizedCode = params.code.trim().toUpperCase();
    const [row] = await this.database
      .select()
      .from(certificates)
      .where(eq(certificates.authenticationCode, normalizedCode))
      .limit(1);

    if (row) return toCertificateReadModel(row);

    const [extraRow] = await this.database
      .select()
      .from(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_EXTRA_CERT),
          eq(outboxMessages.recipient, normalizedCode),
        ),
      )
      .limit(1);

    if (!extraRow) return null;
    const payload = extraRow.payload as unknown as StoredExtraCertPayload;
    return {
      id: extraRow.id,
      authenticationCode: payload.authenticationCode || normalizedCode,
      participantName: payload.participantName || "",
      recipientEmail: payload.recipientEmail || undefined,
      eventTitle: payload.eventTitleSnapshot || "",
      eventStartAt: new Date(payload.eventStartSnapshot || extraRow.createdAt),
      workloadHours: Number(payload.workloadHours) || 8,
      description: payload.descriptionSnapshot || "",
      issuedAt: new Date(payload.issuedAt || extraRow.createdAt),
    };
  }

  async findRenderableByCode(
    params: ValidateCertificateParams,
  ): Promise<CertificateRenderableModel | null> {
    const normalizedCode = params.code.trim().toUpperCase();
    const [row] = await this.database
      .select({
        certificate: certificates,
        event: events,
        registration: registrations,
        participant: participants,
      })
      .from(certificates)
      .innerJoin(events, eq(certificates.eventId, events.id))
      .innerJoin(registrations, eq(certificates.registrationId, registrations.id))
      .innerJoin(participants, eq(certificates.participantId, participants.id))
      .where(eq(certificates.authenticationCode, normalizedCode))
      .limit(1);

    if (row) {
      const workspaceMeta = await this.loadStoredWorkspaceMeta(row.event.id);
      const layoutConfig = parseLayoutConfig(workspaceMeta?.layoutConfig);
      const selectionConfig = parseSelectionConfig(
        workspaceMeta?.selectionConfig,
      );
      const recipientKey = `reg:${row.registration.id}`;
      const override = selectionConfig.overrides[recipientKey];

      const formFieldsRows = await this.database
        .select({
          id: eventFormFields.id,
          label: eventFormFields.label,
        })
        .from(eventFormFields)
        .where(eq(eventFormFields.eventId, row.event.id));

      const fieldLabelById = new Map<string, string>();
      for (const f of formFieldsRows) {
        fieldLabelById.set(f.id, f.label);
      }

      const customVars = {
        ...extractAnswersVariables(
          row.registration.answersSnapshot,
          fieldLabelById,
        ),
        ...(override?.customVars ?? {}),
      };

      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(row.certificate.eventStartSnapshot);

      return {
        certificate: toCertificateReadModel(row.certificate),
        eventId: row.event.id,
        responsibleName: row.event.responsibleName,
        templatePdfKey: workspaceMeta?.templatePdfKey ?? null,
        layoutConfig,
        variables: {
          nome: row.certificate.participantNameSnapshot,
          email: override?.email || row.participant.email,
          cpf: formatCpfDisplay(override?.cpf || row.participant.cpf || ""),
          empresa: override?.company || row.participant.company || "",
          cargo: override?.jobTitle || row.participant.jobTitle || "",
          evento: row.certificate.eventTitleSnapshot,
          data_evento: formattedDate,
          carga_horaria: `${row.certificate.workloadHours}h`,
          descricao_certificado: row.certificate.descriptionSnapshot,
          responsavel: row.event.responsibleName,
          codigo_autenticacao: row.certificate.authenticationCode,
          link_validacao: "",
          codigo_inscricao: row.registration.code,
          customVars,
        },
      };
    }

    // Check extra recipient certificates
    const [extraRow] = await this.database
      .select()
      .from(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_EXTRA_CERT),
          eq(outboxMessages.recipient, normalizedCode),
        ),
      )
      .limit(1);

    if (!extraRow) return null;
    const payload = extraRow.payload as unknown as StoredExtraCertPayload;
    const [eventRow] = await this.database
      .select()
      .from(events)
      .where(eq(events.id, payload.eventId))
      .limit(1);

    if (!eventRow) return null;

    const workspaceMeta = await this.loadStoredWorkspaceMeta(eventRow.id);
    const layoutConfig = parseLayoutConfig(workspaceMeta?.layoutConfig);
    const eventStartDate = new Date(
      payload.eventStartSnapshot || eventRow.startAt,
    );
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(eventStartDate);

    return {
      certificate: {
        id: extraRow.id,
        authenticationCode: payload.authenticationCode,
        participantName: payload.participantName,
        recipientEmail: payload.recipientEmail,
        eventTitle: payload.eventTitleSnapshot,
        eventStartAt: eventStartDate,
        workloadHours: Number(payload.workloadHours) || 8,
        description: payload.descriptionSnapshot,
        issuedAt: new Date(payload.issuedAt || extraRow.createdAt),
      },
      eventId: eventRow.id,
      responsibleName: eventRow.responsibleName,
      templatePdfKey: workspaceMeta?.templatePdfKey ?? null,
      layoutConfig,
      variables: {
        nome: payload.participantName,
        email: payload.recipientEmail || "",
        cpf: formatCpfDisplay(payload.recipientCpf || ""),
        empresa: payload.customVars?.empresa || "",
        cargo: payload.customVars?.cargo || "",
        evento: payload.eventTitleSnapshot || eventRow.title,
        data_evento: formattedDate,
        carga_horaria: `${Number(payload.workloadHours) || 8}h`,
        descricao_certificado: payload.descriptionSnapshot || "",
        responsavel: eventRow.responsibleName,
        codigo_autenticacao: payload.authenticationCode,
        link_validacao: "",
        codigo_inscricao: payload.customVars?.codigo_inscricao || "EXTRA",
        customVars: payload.customVars || {},
      },
    };
  }

  async findForRegistration(params: {
    registrationId: string;
  }): Promise<CertificateReadModel | null> {
    const [row] = await this.database
      .select()
      .from(certificates)
      .where(eq(certificates.registrationId, params.registrationId))
      .limit(1);
    return row ? toCertificateReadModel(row) : null;
  }

  async listCertificateHub(
    params: ListCertificateHubParams,
  ): Promise<CertificateHubReadModel> {
    const baseConditions = [
      eq(events.status, "finalizado"),
      isNull(events.deletedAt),
    ];
    if (!params.canViewAll) {
      baseConditions.push(eq(events.createdByGlobalUserId, params.actorId));
    }

    const finishedEvents = await this.database
      .select()
      .from(events)
      .where(and(...baseConditions))
      .orderBy(desc(events.endAt), desc(events.updatedAt));

    const eventIds = finishedEvents.map((e) => e.id);

    const confirmedByEvent = new Map<string, number>();
    const checkedInByEvent = new Map<string, number>();
    const issuedByEvent = new Map<string, number>();
    const sentByEvent = new Map<string, number>();
    const failedByEvent = new Map<string, number>();
    const workspaceMetaByEvent = new Map<string, StoredWorkspacePayload>();

    if (eventIds.length > 0) {
      const [regRows, certRows, extraCertRows, wsRows, emailRows] =
        await Promise.all([
          this.database
            .select({
              id: registrations.id,
              eventId: registrations.eventId,
              checkInId: checkins.id,
            })
            .from(registrations)
            .leftJoin(
              checkins,
              and(
                eq(registrations.id, checkins.registrationId),
                eq(checkins.type, "normal"),
              ),
            )
            .where(
              and(
                inArray(registrations.eventId, eventIds),
                eq(registrations.status, "confirmada"),
                isNull(registrations.deletedAt),
              ),
            ),
          this.database
            .select({
              id: certificates.id,
              eventId: certificates.eventId,
            })
            .from(certificates)
            .where(inArray(certificates.eventId, eventIds)),
          this.database
            .select()
            .from(outboxMessages)
            .where(
              and(
                eq(outboxMessages.channel, CHANNEL_EXTRA_CERT),
                inArray(outboxMessages.subject, eventIds),
              ),
            ),
          this.database
            .select()
            .from(outboxMessages)
            .where(
              and(
                eq(outboxMessages.channel, CHANNEL_WORKSPACE),
                inArray(outboxMessages.recipient, eventIds),
              ),
            ),
          this.database
            .select()
            .from(outboxMessages)
            .where(
              and(
                eq(outboxMessages.channel, CHANNEL_EMAIL_STATUS),
                inArray(outboxMessages.subject, eventIds),
              ),
            ),
        ]);

      for (const r of regRows) {
        confirmedByEvent.set(
          r.eventId,
          (confirmedByEvent.get(r.eventId) ?? 0) + 1,
        );
        if (r.checkInId) {
          checkedInByEvent.set(
            r.eventId,
            (checkedInByEvent.get(r.eventId) ?? 0) + 1,
          );
        }
      }

      for (const c of certRows) {
        issuedByEvent.set(c.eventId, (issuedByEvent.get(c.eventId) ?? 0) + 1);
      }

      for (const ec of extraCertRows) {
        issuedByEvent.set(
          ec.subject,
          (issuedByEvent.get(ec.subject) ?? 0) + 1,
        );
      }

      for (const ws of wsRows) {
        workspaceMetaByEvent.set(
          ws.recipient,
          (ws.payload ?? {}) as StoredWorkspacePayload,
        );
      }

      for (const em of emailRows) {
        if (em.status === "sent") {
          sentByEvent.set(em.subject, (sentByEvent.get(em.subject) ?? 0) + 1);
        } else if (em.status === "failed") {
          failedByEvent.set(
            em.subject,
            (failedByEvent.get(em.subject) ?? 0) + 1,
          );
        }
      }
    }

    const queryLower = params.query?.trim().toLowerCase() || "";

    const allSummaries: CertificateEventSummaryReadModel[] = finishedEvents.map(
      (ev) => {
        const meta = workspaceMetaByEvent.get(ev.id);
        const workflowStatus = normalizeWorkflowStatus(meta?.workflowStatus);
        return {
          eventId: ev.id,
          title: ev.title,
          slug: ev.slug,
          modality: ev.modality,
          startAt: ev.startAt,
          endAt: ev.endAt,
          workloadHours: ev.workloadHours > 0 ? ev.workloadHours : 8,
          workflowStatus,
          templatePdfName: meta?.templatePdfName ?? null,
          hasCustomTemplate: Boolean(meta?.templatePdfKey),
          confirmedCount: confirmedByEvent.get(ev.id) ?? 0,
          checkedInCount: checkedInByEvent.get(ev.id) ?? 0,
          issuedCount: issuedByEvent.get(ev.id) ?? 0,
          sentCount: sentByEvent.get(ev.id) ?? 0,
          failedCount: failedByEvent.get(ev.id) ?? 0,
          updatedAt: ev.updatedAt,
        };
      },
    );

    const counts = {
      pendingEvents: allSummaries.filter((s) => s.workflowStatus === "pendente")
        .length,
      completedEvents: allSummaries.filter(
        (s) => s.workflowStatus === "concluido",
      ).length,
      dismissedEvents: allSummaries.filter(
        (s) => s.workflowStatus === "dispensado",
      ).length,
      totalIssued: allSummaries.reduce((acc, s) => acc + s.issuedCount, 0),
      totalSent: allSummaries.reduce((acc, s) => acc + s.sentCount, 0),
    };

    const filteredEvents = queryLower
      ? allSummaries.filter(
          (s) =>
            s.title.toLowerCase().includes(queryLower) ||
            s.slug.toLowerCase().includes(queryLower),
        )
      : allSummaries;

    const presets = await this.listPresets();

    return {
      events: filteredEvents,
      presets,
      counts,
    };
  }

  async updateEventWorkflowStatus(
    params: UpdateEventWorkflowStatusParams,
  ): Promise<CertificateEventSummaryReadModel | null> {
    const conditions = [
      eq(events.id, params.eventId),
      isNull(events.deletedAt),
    ];
    if (!params.canViewAll) {
      conditions.push(eq(events.createdByGlobalUserId, params.actorId));
    }

    const [existing] = await this.database
      .select()
      .from(events)
      .where(and(...conditions))
      .limit(1);

    if (!existing) return null;

    await this.database
      .update(events)
      .set({
        certificateEnabled: params.workflowStatus !== "dispensado",
        updatedAt: params.at,
      })
      .where(eq(events.id, params.eventId));

    const currentMeta = (await this.loadStoredWorkspaceMeta(params.eventId)) ?? {};
    await this.saveStoredWorkspaceMeta(
      params.eventId,
      {
        ...currentMeta,
        workflowStatus: params.workflowStatus,
      },
      params.at,
    );

    const hub = await this.listCertificateHub({
      actorId: params.actorId,
      canViewAll: params.canViewAll,
    });

    return hub.events.find((e) => e.eventId === params.eventId) ?? null;
  }

  async getEventWorkspace(
    params: GetEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null> {
    const conditions = [
      eq(events.id, params.eventId),
      isNull(events.deletedAt),
    ];
    if (!params.canViewAll) {
      conditions.push(eq(events.createdByGlobalUserId, params.actorId));
    }

    const [eventRow] = await this.database
      .select()
      .from(events)
      .where(and(...conditions))
      .limit(1);

    if (!eventRow) return null;

    const [
      rawMeta,
      formFieldsRows,
      regRows,
      certRows,
      extraCertRows,
      emailStatusRows,
      presets,
    ] = await Promise.all([
      this.loadStoredWorkspaceMeta(eventRow.id),
      this.database
        .select({
          id: eventFormFields.id,
          label: eventFormFields.label,
        })
        .from(eventFormFields)
        .where(
          and(
            eq(eventFormFields.eventId, eventRow.id),
            eq(eventFormFields.active, true),
          ),
        ),
      this.database
        .select({
          registrationId: registrations.id,
          registrationCode: registrations.code,
          answersSnapshot: registrations.answersSnapshot,
          participantId: participants.id,
          participantName: participants.name,
          participantEmail: participants.email,
          participantCpf: participants.cpf,
          participantCompany: participants.company,
          participantJobTitle: participants.jobTitle,
          checkInId: checkins.id,
          checkInHappenedAt: checkins.happenedAt,
        })
        .from(registrations)
        .innerJoin(
          participants,
          eq(registrations.participantId, participants.id),
        )
        .leftJoin(
          checkins,
          and(
            eq(registrations.id, checkins.registrationId),
            eq(checkins.type, "normal"),
          ),
        )
        .where(
          and(
            eq(registrations.eventId, eventRow.id),
            eq(registrations.status, "confirmada"),
            isNull(registrations.deletedAt),
          ),
        ),
      this.database
        .select()
        .from(certificates)
        .where(eq(certificates.eventId, eventRow.id)),
      this.database
        .select()
        .from(outboxMessages)
        .where(
          and(
            eq(outboxMessages.channel, CHANNEL_EXTRA_CERT),
            eq(outboxMessages.subject, eventRow.id),
          ),
        ),
      this.database
        .select()
        .from(outboxMessages)
        .where(
          and(
            eq(outboxMessages.channel, CHANNEL_EMAIL_STATUS),
            eq(outboxMessages.subject, eventRow.id),
          ),
        ),
      this.listPresets(),
    ]);

    const meta = rawMeta ?? {};
    const layoutConfig = parseLayoutConfig(meta.layoutConfig);
    const emailConfig = parseEmailConfig(meta.emailConfig);
    const selectionConfig = parseSelectionConfig(meta.selectionConfig);

    const fieldLabelById = new Map<string, string>();
    for (const f of formFieldsRows) {
      fieldLabelById.set(f.id, f.label);
    }

    const certByRegId = new Map<string, typeof certificates.$inferSelect>();
    for (const c of certRows) {
      certByRegId.set(c.registrationId, c);
    }

    const extraCertByKey = new Map<string, StoredExtraCertPayload>();
    for (const ec of extraCertRows) {
      const p = ec.payload as unknown as StoredExtraCertPayload;
      if (p?.recipientKey) {
        extraCertByKey.set(p.recipientKey, { ...p, id: ec.id });
      }
    }

    const emailStatusByKey = new Map<
      string,
      typeof outboxMessages.$inferSelect
    >();
    for (const em of emailStatusRows) {
      emailStatusByKey.set(em.template, em);
    }

    const recipients: CertificateWorkspaceRecipientReadModel[] = [];
    const extraCustomVarKeys = new Set<string>();

    for (const reg of regRows) {
      const recipientKey = `reg:${reg.registrationId}`;
      const override = selectionConfig.overrides[recipientKey];
      const existingCert = certByRegId.get(reg.registrationId);
      const emailRecord = emailStatusByKey.get(recipientKey);
      const hasCheckIn = Boolean(reg.checkInId);

      const defaultSelected = hasCheckIn
        ? true
        : selectionConfig.includeWithoutCheckIn;
      const selected =
        override?.selected !== undefined ? override.selected : defaultSelected;

      const answersVars = extractAnswersVariables(
        reg.answersSnapshot,
        fieldLabelById,
      );
      const mergedCustomVars: Record<string, string> = {
        ...answersVars,
        ...(override?.customVars ?? {}),
      };
      for (const k of Object.keys(mergedCustomVars)) {
        extraCustomVarKeys.add(k);
      }

      recipients.push({
        recipientKey,
        source: hasCheckIn ? "checkin" : "confirmado",
        registrationId: reg.registrationId,
        participantId: reg.participantId,
        registrationCode: reg.registrationCode,
        selected,
        name:
          override?.name ??
          existingCert?.participantNameSnapshot ??
          reg.participantName,
        originalName: reg.participantName,
        email: override?.email ?? reg.participantEmail,
        cpf: override?.cpf ?? reg.participantCpf ?? "",
        company: override?.company ?? reg.participantCompany ?? "",
        jobTitle: override?.jobTitle ?? reg.participantJobTitle ?? "",
        hasCheckIn,
        checkInAt: reg.checkInHappenedAt ?? null,
        customVars: mergedCustomVars,
        certificateId: existingCert?.id ?? null,
        authenticationCode: existingCert?.authenticationCode ?? null,
        issuedAt: existingCert?.issuedAt ?? null,
        emailStatus: normalizeEmailStatus(emailRecord?.status),
        emailSentAt: emailRecord?.sentAt ?? null,
        emailError: emailRecord?.lastError ?? null,
      });
    }

    for (const extra of selectionConfig.extraRecipients) {
      const recipientKey = extra.id.startsWith("extra:")
        ? extra.id
        : `extra:${extra.id}`;
      const existingExtraCert = extraCertByKey.get(recipientKey);
      const emailRecord = emailStatusByKey.get(recipientKey);
      for (const k of Object.keys(extra.customVars || {})) {
        extraCustomVarKeys.add(k);
      }

      recipients.push({
        recipientKey,
        source: "extra",
        registrationId: null,
        participantId: null,
        registrationCode: extra.roleLabel || "EXTRA",
        selected: extra.selected,
        name: extra.name || existingExtraCert?.participantName || "",
        originalName: extra.name || "",
        email: extra.email || existingExtraCert?.recipientEmail || "",
        cpf: extra.cpf || existingExtraCert?.recipientCpf || "",
        company: extra.company || "",
        jobTitle: extra.jobTitle || "",
        hasCheckIn: false,
        checkInAt: null,
        customVars: extra.customVars || {},
        certificateId: existingExtraCert?.id ?? null,
        authenticationCode: existingExtraCert?.authenticationCode ?? null,
        issuedAt: existingExtraCert?.issuedAt
          ? new Date(existingExtraCert.issuedAt)
          : null,
        emailStatus: normalizeEmailStatus(emailRecord?.status),
        emailSentAt: emailRecord?.sentAt ?? null,
        emailError: emailRecord?.lastError ?? null,
      });
    }

    const baseVars = [
      "nome",
      "email",
      "cpf",
      "empresa",
      "cargo",
      "evento",
      "data_evento",
      "carga_horaria",
      "descricao_certificado",
      "responsavel",
      "codigo_autenticacao",
      "link_validacao",
      "codigo_inscricao",
    ];
    for (const f of formFieldsRows) {
      if (f.label && !baseVars.includes(f.label)) {
        baseVars.push(f.label);
      }
    }
    for (const extraKey of extraCustomVarKeys) {
      if (extraKey && !baseVars.includes(extraKey)) {
        baseVars.push(extraKey);
      }
    }

    return {
      event: {
        id: eventRow.id,
        title: eventRow.title,
        slug: eventRow.slug,
        modality: eventRow.modality,
        startAt: eventRow.startAt,
        endAt: eventRow.endAt,
        status: eventRow.status,
        responsibleName: eventRow.responsibleName,
        responsibleEmail: eventRow.responsibleEmail,
        workflowStatus: normalizeWorkflowStatus(meta.workflowStatus),
        workloadHours: eventRow.workloadHours > 0 ? eventRow.workloadHours : 8,
        certificateDescription:
          eventRow.certificateDescription ||
          `participou com êxito do evento ${eventRow.title}`,
        templatePdfKey: meta.templatePdfKey ?? null,
        templatePdfName: meta.templatePdfName ?? null,
      },
      layoutConfig,
      emailConfig,
      selectionConfig,
      recipients,
      availableVariables: baseVars,
      presets,
    };
  }

  async saveEventWorkspace(
    params: SaveEventCertificateWorkspaceParams,
  ): Promise<CertificateEventWorkspaceReadModel | null> {
    const conditions = [
      eq(events.id, params.eventId),
      isNull(events.deletedAt),
    ];
    if (!params.canViewAll) {
      conditions.push(eq(events.createdByGlobalUserId, params.actorId));
    }

    const [existing] = await this.database
      .select()
      .from(events)
      .where(and(...conditions))
      .limit(1);

    if (!existing) return null;

    const eventPatch: Partial<typeof events.$inferInsert> = {
      updatedAt: params.at,
    };

    if (params.workloadHours !== undefined) {
      eventPatch.workloadHours = Math.max(1, Math.round(params.workloadHours));
    }
    if (params.certificateDescription !== undefined) {
      eventPatch.certificateDescription = params.certificateDescription;
    }
    if (params.workflowStatus !== undefined) {
      eventPatch.certificateEnabled = params.workflowStatus !== "dispensado";
    }

    await this.database
      .update(events)
      .set(eventPatch)
      .where(eq(events.id, params.eventId));

    const currentMeta = (await this.loadStoredWorkspaceMeta(params.eventId)) ?? {};
    const nextMeta: StoredWorkspacePayload = {
      ...currentMeta,
      ...(params.workflowStatus !== undefined
        ? { workflowStatus: params.workflowStatus }
        : {}),
      ...(params.templatePdfKey !== undefined
        ? { templatePdfKey: params.templatePdfKey }
        : {}),
      ...(params.templatePdfName !== undefined
        ? { templatePdfName: params.templatePdfName }
        : {}),
      ...(params.layoutConfig !== undefined
        ? { layoutConfig: params.layoutConfig }
        : {}),
      ...(params.emailConfig !== undefined
        ? {
            emailConfig: {
              ...params.emailConfig,
              extraAttachments:
                params.emailConfig.extraAttachments ??
                currentMeta.emailConfig?.extraAttachments ??
                [],
            },
          }
        : {}),
      ...(params.selectionConfig !== undefined
        ? { selectionConfig: params.selectionConfig }
        : {}),
    };

    await this.saveStoredWorkspaceMeta(params.eventId, nextMeta, params.at);

    return this.getEventWorkspace({
      eventId: params.eventId,
      actorId: params.actorId,
      canViewAll: params.canViewAll,
    });
  }

  async issueWorkspaceBatch(
    params: IssueWorkspaceBatchParams,
  ): Promise<CertificateEventWorkspaceReadModel | null> {
    const workspace = await this.getEventWorkspace({
      eventId: params.eventId,
      actorId: params.actorId,
      canViewAll: params.canViewAll,
    });
    if (!workspace) return null;

    const selectedRecipients = workspace.recipients.filter(
      (r) => r.selected && r.name.trim().length > 0,
    );

    const workloadHours = Math.max(1, workspace.event.workloadHours || 8);
    const descriptionSnapshot =
      workspace.event.certificateDescription ||
      `Participou do evento ${workspace.event.title}.`;

    for (const recipient of selectedRecipients) {
      if (recipient.registrationId && recipient.participantId) {
        if (recipient.certificateId) {
          await this.database
            .update(certificates)
            .set({
              workloadHours,
              descriptionSnapshot,
              eventTitleSnapshot: workspace.event.title,
              participantNameSnapshot: recipient.name.trim(),
              updatedAt: params.at,
            })
            .where(eq(certificates.id, recipient.certificateId));
        } else {
          const authCode = this.credentialProvider.issueCertificateCode({
            year: params.at.getUTCFullYear(),
          });

          await this.database
            .insert(certificates)
            .values({
              registrationId: recipient.registrationId,
              eventId: workspace.event.id,
              participantId: recipient.participantId,
              authenticationCode: authCode,
              workloadHours,
              descriptionSnapshot,
              eventTitleSnapshot: workspace.event.title,
              participantNameSnapshot: recipient.name.trim(),
              eventStartSnapshot: workspace.event.startAt,
              issuedAt: params.at,
              createdAt: params.at,
              updatedAt: params.at,
            })
            .onConflictDoNothing();
        }
      } else {
        // Extra recipient certificate stored in outbox_messages
        const customVarsSnapshot: Record<string, string> = {
          ...recipient.customVars,
          empresa: recipient.company || "",
          cargo: recipient.jobTitle || "",
          codigo_inscricao: recipient.registrationCode || "EXTRA",
        };

        if (recipient.certificateId && recipient.authenticationCode) {
          const payload: StoredExtraCertPayload = {
            id: recipient.certificateId,
            eventId: workspace.event.id,
            recipientKey: recipient.recipientKey,
            authenticationCode: recipient.authenticationCode,
            participantName: recipient.name.trim(),
            recipientEmail: recipient.email.trim().toLowerCase(),
            recipientCpf: recipient.cpf.trim(),
            workloadHours,
            descriptionSnapshot,
            eventTitleSnapshot: workspace.event.title,
            eventStartSnapshot: workspace.event.startAt.toISOString(),
            issuedAt: (recipient.issuedAt ?? params.at).toISOString(),
            customVars: customVarsSnapshot,
          };

          await this.database
            .update(outboxMessages)
            .set({
              payload: payload as unknown as Record<string, unknown>,
              updatedAt: params.at,
            })
            .where(eq(outboxMessages.id, recipient.certificateId));
        } else {
          const authCode = this.credentialProvider.issueCertificateCode({
            year: params.at.getUTCFullYear(),
          });
          const payload: StoredExtraCertPayload = {
            id: "",
            eventId: workspace.event.id,
            recipientKey: recipient.recipientKey,
            authenticationCode: authCode,
            participantName: recipient.name.trim(),
            recipientEmail: recipient.email.trim().toLowerCase(),
            recipientCpf: recipient.cpf.trim(),
            workloadHours,
            descriptionSnapshot,
            eventTitleSnapshot: workspace.event.title,
            eventStartSnapshot: workspace.event.startAt.toISOString(),
            issuedAt: params.at.toISOString(),
            customVars: customVarsSnapshot,
          };

          await this.database.insert(outboxMessages).values({
            channel: CHANNEL_EXTRA_CERT,
            recipient: authCode,
            subject: workspace.event.id,
            template: recipient.recipientKey,
            payload: payload as unknown as Record<string, unknown>,
            status: "issued",
            createdAt: params.at,
            updatedAt: params.at,
          });
        }
      }
    }

    return this.getEventWorkspace({
      eventId: params.eventId,
      actorId: params.actorId,
      canViewAll: params.canViewAll,
    });
  }

  async recordRecipientEmailResult(
    params: RecordRecipientEmailResultParams,
  ): Promise<void> {
    const compositeRecipient = `${params.eventId}:${params.recipientKey}`.slice(
      0,
      254,
    );

    const [existing] = await this.database
      .select()
      .from(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_EMAIL_STATUS),
          eq(outboxMessages.recipient, compositeRecipient),
        ),
      )
      .limit(1);

    const payload = {
      eventId: params.eventId,
      recipientKey: params.recipientKey,
      messageId: params.messageId ?? null,
    };

    if (existing) {
      await this.database
        .update(outboxMessages)
        .set({
          status: params.status,
          lastError:
            params.status === "failed"
              ? (params.error ?? "Falha no envio")
              : null,
          sentAt: params.status === "sent" ? params.at : null,
          payload,
          updatedAt: params.at,
        })
        .where(eq(outboxMessages.id, existing.id));
    } else {
      await this.database.insert(outboxMessages).values({
        channel: CHANNEL_EMAIL_STATUS,
        recipient: compositeRecipient,
        subject: params.eventId,
        template: params.recipientKey.slice(0, 80),
        payload,
        status: params.status,
        lastError:
          params.status === "failed"
            ? (params.error ?? "Falha no envio")
            : null,
        sentAt: params.status === "sent" ? params.at : null,
        createdAt: params.at,
        updatedAt: params.at,
      });
    }
  }

  async resetEventEmailStatuses(
    params: ResetEventEmailStatusesParams,
  ): Promise<void> {
    const workspace = await this.getEventWorkspace({
      eventId: params.eventId,
      actorId: params.actorId,
      canViewAll: params.canViewAll,
    });
    if (!workspace) return;

    await this.database
      .delete(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_EMAIL_STATUS),
          eq(outboxMessages.subject, params.eventId),
        ),
      );
  }

  async listPresets(): Promise<CertificatePresetReadModel[]> {
    const rows = await this.database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.channel, CHANNEL_PRESET))
      .orderBy(desc(outboxMessages.createdAt));

    const customPresets: CertificatePresetReadModel[] = rows.map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        name:
          (typeof payload.name === "string" ? payload.name : row.subject) ||
          "Modelo Salvo",
        templatePdfKey:
          typeof payload.templatePdfKey === "string"
            ? payload.templatePdfKey
            : null,
        templatePdfName:
          typeof payload.templatePdfName === "string"
            ? payload.templatePdfName
            : null,
        layoutConfig: parseLayoutConfig(
          payload.layoutConfig as Record<string, unknown> | undefined,
        ),
        emailConfig: payload.emailConfig
          ? parseEmailConfig(payload.emailConfig as Record<string, unknown>)
          : null,
        workloadHoursDefault:
          typeof payload.workloadHoursDefault === "number"
            ? payload.workloadHoursDefault
            : null,
        createdAt: row.createdAt,
      };
    });

    return customPresets;
  }

  async createPreset(
    params: CreateCertificatePresetParams,
  ): Promise<CertificatePresetReadModel> {
    const payload = {
      name: params.name.trim(),
      templatePdfKey: params.templatePdfKey ?? null,
      templatePdfName: params.templatePdfName ?? null,
      layoutConfig: params.layoutConfig,
      emailConfig: params.emailConfig ?? null,
      workloadHoursDefault: params.workloadHoursDefault ?? null,
    };

    const [inserted] = await this.database
      .insert(outboxMessages)
      .values({
        channel: CHANNEL_PRESET,
        recipient: params.createdByGlobalUserId.slice(0, 254),
        subject: params.name.trim().slice(0, 180),
        template: "certificate-preset",
        payload: payload as unknown as Record<string, unknown>,
        status: "stored",
        createdAt: params.at,
        updatedAt: params.at,
      })
      .returning();

    return {
      id: inserted.id,
      name: payload.name,
      templatePdfKey: payload.templatePdfKey,
      templatePdfName: payload.templatePdfName,
      layoutConfig: params.layoutConfig,
      emailConfig: params.emailConfig ?? null,
      workloadHoursDefault: params.workloadHoursDefault ?? null,
      createdAt: inserted.createdAt,
    };
  }

  async deletePreset(params: DeleteCertificatePresetParams): Promise<boolean> {
    const deleted = await this.database
      .delete(outboxMessages)
      .where(
        and(
          eq(outboxMessages.id, params.presetId),
          eq(outboxMessages.channel, CHANNEL_PRESET),
        ),
      )
      .returning({ id: outboxMessages.id });

    return deleted.length > 0;
  }

  private async loadStoredWorkspaceMeta(
    eventId: string,
  ): Promise<StoredWorkspacePayload | null> {
    const [row] = await this.database
      .select()
      .from(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_WORKSPACE),
          eq(outboxMessages.recipient, eventId),
        ),
      )
      .orderBy(desc(outboxMessages.updatedAt))
      .limit(1);

    if (!row) return null;
    return (row.payload ?? {}) as StoredWorkspacePayload;
  }

  private async saveStoredWorkspaceMeta(
    eventId: string,
    meta: StoredWorkspacePayload,
    at: Date,
  ): Promise<void> {
    const [existing] = await this.database
      .select()
      .from(outboxMessages)
      .where(
        and(
          eq(outboxMessages.channel, CHANNEL_WORKSPACE),
          eq(outboxMessages.recipient, eventId),
        ),
      )
      .limit(1);

    const status = normalizeWorkflowStatus(meta.workflowStatus);

    if (existing) {
      await this.database
        .update(outboxMessages)
        .set({
          status,
          payload: meta as unknown as Record<string, unknown>,
          updatedAt: at,
        })
        .where(eq(outboxMessages.id, existing.id));
    } else {
      await this.database.insert(outboxMessages).values({
        channel: CHANNEL_WORKSPACE,
        recipient: eventId,
        subject: "Workspace de Certificados",
        template: "certificate-workspace",
        payload: meta as unknown as Record<string, unknown>,
        status,
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  private isEligible(candidate: CertificateCandidate): boolean {
    const result = this.eligibilityService.execute({
      registrationStatus: candidate.registrationStatus,
      eventStatus: candidate.eventStatus,
      hasCheckIn: candidate.checkInId !== null,
      certificateEnabled: candidate.certificateEnabled,
      workloadHours: Math.max(1, candidate.workloadHours || 8),
    });
    return result.isSuccess;
  }
}

function toCertificateReadModel(
  row: typeof certificates.$inferSelect,
): CertificateReadModel {
  return {
    id: row.id,
    authenticationCode: row.authenticationCode,
    participantName: row.participantNameSnapshot,
    eventTitle: row.eventTitleSnapshot,
    eventStartAt: row.eventStartSnapshot,
    workloadHours: row.workloadHours,
    description: row.descriptionSnapshot,
    issuedAt: row.issuedAt,
  };
}

function normalizeWorkflowStatus(
  raw: string | null | undefined,
): CertificateWorkflowStatus {
  if (raw === "concluido" || raw === "dispensado") return raw;
  return "pendente";
}

function normalizeEmailStatus(
  raw: string | null | undefined,
): "idle" | "sending" | "sent" | "failed" {
  if (raw === "sent" || raw === "failed" || raw === "sending") return raw;
  return "idle";
}

function parseLayoutConfig(
  raw: Record<string, unknown> | CertificateLayoutConfig | null | undefined,
): CertificateLayoutConfig {
  if (!raw || typeof raw !== "object") {
    return JSON.parse(
      JSON.stringify(DEFAULT_CERTIFICATE_LAYOUT_CONFIG),
    ) as CertificateLayoutConfig;
  }
  const obj = raw as Record<string, unknown>;
  const fields = Array.isArray(obj.fields)
    ? (obj.fields as CertificateLayoutConfig["fields"])
    : DEFAULT_CERTIFICATE_LAYOUT_CONFIG.fields;
  const qrCode =
    obj.qrCode && typeof obj.qrCode === "object"
      ? {
          ...DEFAULT_CERTIFICATE_LAYOUT_CONFIG.qrCode,
          ...(obj.qrCode as Partial<CertificateLayoutConfig["qrCode"]>),
        }
      : DEFAULT_CERTIFICATE_LAYOUT_CONFIG.qrCode;

  return {
    fields:
      fields.length > 0 ? fields : DEFAULT_CERTIFICATE_LAYOUT_CONFIG.fields,
    qrCode,
  };
}

function parseEmailConfig(
  raw: Record<string, unknown> | CertificateEmailConfig | null | undefined,
): CertificateEmailConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CERTIFICATE_EMAIL_CONFIG, extraAttachments: [] };
  }
  const obj = raw as Record<string, unknown>;
  const extraAttachments: CertificateEmailExtraAttachment[] = Array.isArray(
    obj.extraAttachments,
  )
    ? obj.extraAttachments
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        )
        .map((item) => ({
          id: typeof item.id === "string" ? item.id.trim() : "",
          key: typeof item.key === "string" ? item.key.trim() : "",
          filename:
            typeof item.filename === "string" ? item.filename.trim() : "",
          contentType:
            typeof item.contentType === "string" && item.contentType.trim()
              ? item.contentType.trim()
              : "application/octet-stream",
          sizeBytes:
            typeof item.sizeBytes === "number" && item.sizeBytes > 0
              ? Math.round(item.sizeBytes)
              : 0,
        }))
        .filter((item) => Boolean(item.id && item.key && item.filename))
    : [];

  return {
    subject:
      typeof obj.subject === "string" && obj.subject.trim()
        ? obj.subject
        : DEFAULT_CERTIFICATE_EMAIL_CONFIG.subject,
    body:
      typeof obj.body === "string" && obj.body.trim()
        ? obj.body
        : DEFAULT_CERTIFICATE_EMAIL_CONFIG.body,
    attachmentNamePattern:
      typeof obj.attachmentNamePattern === "string" &&
      obj.attachmentNamePattern.trim()
        ? obj.attachmentNamePattern
        : DEFAULT_CERTIFICATE_EMAIL_CONFIG.attachmentNamePattern,
    delaySeconds:
      typeof obj.delaySeconds === "number" && obj.delaySeconds >= 1
        ? obj.delaySeconds
        : DEFAULT_CERTIFICATE_EMAIL_CONFIG.delaySeconds,
    extraAttachments,
  };
}

function parseSelectionConfig(
  raw: Record<string, unknown> | CertificateSelectionConfig | null | undefined,
): CertificateSelectionConfig {
  if (!raw || typeof raw !== "object") {
    return {
      includeWithoutCheckIn: false,
      overrides: {},
      extraRecipients: [],
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    includeWithoutCheckIn: Boolean(obj.includeWithoutCheckIn),
    overrides:
      obj.overrides && typeof obj.overrides === "object"
        ? (obj.overrides as CertificateSelectionConfig["overrides"])
        : {},
    extraRecipients: Array.isArray(obj.extraRecipients)
      ? (obj.extraRecipients as CertificateSelectionConfig["extraRecipients"])
      : [],
  };
}

function extractAnswersVariables(
  snapshot: Record<string, unknown> | null | undefined,
  fieldLabelById: Map<string, string>,
): Record<string, string> {
  if (!snapshot || typeof snapshot !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(snapshot)) {
    const label = fieldLabelById.get(key) || key;
    if (Array.isArray(val)) {
      result[label] = val.map((item) => String(item ?? "")).join(", ");
    } else if (typeof val === "boolean") {
      result[label] = val ? "Sim" : "Não";
    } else if (val !== null && val !== undefined && typeof val !== "object") {
      result[label] = String(val);
    }
  }
  return result;
}

function formatCpfDisplay(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
