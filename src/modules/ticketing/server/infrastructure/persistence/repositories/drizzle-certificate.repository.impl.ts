import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { CertificateBatchResult, CertificateReadModel, CreateCertificatesParams, ValidateCertificateParams } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import { CertificateEligibilityDomainService } from "@/modules/ticketing/domain/services/certificate-eligibility.domain-service";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import { certificates, checkins, events, participants, registrations } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleCertificateRepositoryDependencies = { database: Database; credentialProvider: ICredentialProvider };
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

  async issueEligible(params: CreateCertificatesParams): Promise<CertificateBatchResult> {
    const candidates = await this.database.select({
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
    }).from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(checkins, and(eq(registrations.id, checkins.registrationId), eq(checkins.type, "normal")))
      .leftJoin(certificates, eq(registrations.id, certificates.registrationId))
      .where(and(eq(events.id, params.eventId), isNull(events.deletedAt), isNull(registrations.deletedAt)));
    const domainEligible = candidates.filter((candidate) => this.isEligible(candidate));
    const missing = domainEligible.filter((candidate) => candidate.certificateId === null);
    if (!missing.length) return { created: 0, existing: domainEligible.length };
    const values = missing.map((candidate) => ({
      registrationId: candidate.registrationId,
      eventId: candidate.eventId,
      participantId: candidate.participantId,
      authenticationCode: this.credentialProvider.issueCertificateCode({ year: params.at.getUTCFullYear() }),
      workloadHours: candidate.workloadHours,
      descriptionSnapshot: candidate.description || `Participou do evento ${candidate.eventTitle}.`,
      eventTitleSnapshot: candidate.eventTitle,
      participantNameSnapshot: candidate.participantName,
      eventStartSnapshot: candidate.eventStartAt,
      issuedAt: params.at,
      createdAt: params.at,
    }));
    const inserted = await this.database.insert(certificates).values(values).onConflictDoNothing().returning({ id: certificates.id });
    return { created: inserted.length, existing: candidates.length - inserted.length };
  }

  async findByCode(params: ValidateCertificateParams): Promise<CertificateReadModel | null> {
    const [row] = await this.database.select().from(certificates).where(eq(certificates.authenticationCode, params.code.toUpperCase())).limit(1);
    return row ? toCertificateReadModel(row) : null;
  }

  async findForRegistration(params: { registrationId: string }): Promise<CertificateReadModel | null> {
    const [row] = await this.database.select().from(certificates).where(eq(certificates.registrationId, params.registrationId)).limit(1);
    return row ? toCertificateReadModel(row) : null;
  }

  private isEligible(candidate: CertificateCandidate): boolean {
    const result = this.eligibilityService.execute({
      registrationStatus: candidate.registrationStatus,
      eventStatus: candidate.eventStatus,
      hasCheckIn: candidate.checkInId !== null,
      certificateEnabled: candidate.certificateEnabled,
      workloadHours: candidate.workloadHours,
    });
    return result.isSuccess;
  }
}

function toCertificateReadModel(row: typeof certificates.$inferSelect): CertificateReadModel {
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
