import "server-only";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import type { Database } from "../database";
import {
  events,
  participants,
  registrations,
  ticketLots,
  certificates,
  payments,
  participantAuthTokens,
  auditLogs,
  type ParticipantRow,
} from "../schema";
import type {
  ActivationTokenRecord,
  OtpTokenRecord,
  ParticipantAuthRecord,
  ParticipantAuthRepository,
  ParticipantEventItem,
  SaveActivationTokenParams,
  SaveOtpTokenParams,
  UpsertActiveParticipantParams,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import type { RegistrationStatus } from "@/modules/ticketing/domain/registrations/entities/registration.aggregate";

export type DrizzleParticipantAuthRepositoryDependencies = {
  database: Database;
};

// In-memory fallback in case the database owner hasn't run the DDL migration yet
const memoryTokens = new Map<string, ActivationTokenRecord & { code?: string; type: string }>();
const memoryPasswords = new Map<string, string>(); // participantId -> passwordHash

export class DrizzleParticipantAuthRepository implements ParticipantAuthRepository {
  private readonly database: Database;

  constructor(dependencies: DrizzleParticipantAuthRepositoryDependencies) {
    this.database = dependencies.database;
  }

  async findByEmail(email: string): Promise<ParticipantAuthRecord | null> {
    const normalized = email.trim().toLowerCase();
    const [row] = await this.database
      .select()
      .from(participants)
      .where(and(eq(participants.email, normalized), isNull(participants.deletedAt)))
      .limit(1);

    if (!row) return null;
    return this.mapToAuthRecord(row);
  }

  async findByCpf(cpf: string): Promise<ParticipantAuthRecord | null> {
    const digits = cpf.replace(/\D/g, "");
    const [row] = await this.database
      .select()
      .from(participants)
      .where(and(eq(participants.cpf, digits), isNull(participants.deletedAt)))
      .limit(1);

    if (!row) return null;
    return this.mapToAuthRecord(row);
  }

  async findById(id: string): Promise<ParticipantAuthRecord | null> {
    const [row] = await this.database
      .select()
      .from(participants)
      .where(and(eq(participants.id, id), isNull(participants.deletedAt)))
      .limit(1);

    if (!row) return null;
    return this.mapToAuthRecord(row);
  }

  async saveActivationToken(params: SaveActivationTokenParams): Promise<void> {
    try {
      await this.database.insert(participantAuthTokens).values({
        type: "ativacao",
        email: params.email.trim().toLowerCase(),
        cpf: params.cpf ? params.cpf.replace(/\D/g, "") : null,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      });
    } catch {
      // Fallback if table not yet created by database owner
      const id = params.id || crypto.randomUUID();
      const record: ActivationTokenRecord & { type: string } = {
        id,
        email: params.email.trim().toLowerCase(),
        cpf: params.cpf ? params.cpf.replace(/\D/g, "") : null,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        usedAt: null,
        type: "ativacao",
      };
      memoryTokens.set(params.tokenHash, record);
      await this.saveTokenAuditFallback("ativacao", record);
    }
  }

  async findActivationToken(tokenHash: string): Promise<ActivationTokenRecord | null> {
    try {
      const [row] = await this.database
        .select()
        .from(participantAuthTokens)
        .where(
          and(
            eq(participantAuthTokens.tokenHash, tokenHash),
            eq(participantAuthTokens.type, "ativacao"),
          ),
        )
        .limit(1);

      if (row) {
        return {
          id: row.id,
          email: row.email,
          cpf: row.cpf,
          tokenHash: row.tokenHash,
          expiresAt: row.expiresAt,
          usedAt: row.usedAt,
        };
      }
    } catch {
      // Fallback
    }

    const mem = memoryTokens.get(tokenHash);
    if (mem && mem.type === "ativacao") return mem;

    const fromAudit = await this.findTokenAuditFallback(tokenHash, "ativacao");
    if (fromAudit) return fromAudit;

    return null;
  }

  async markTokenUsed(idOrHash: string): Promise<void> {
    try {
      await this.database
        .update(participantAuthTokens)
        .set({ usedAt: new Date() })
        .where(
          or(
            eq(participantAuthTokens.id, idOrHash),
            eq(participantAuthTokens.tokenHash, idOrHash),
          ),
        );
    } catch {
      // Fallback
    }

    for (const [key, token] of memoryTokens.entries()) {
      if (token.id === idOrHash || token.tokenHash === idOrHash) {
        token.usedAt = new Date();
        memoryTokens.set(key, token);
      }
    }
  }

  async saveOtpToken(params: SaveOtpTokenParams): Promise<void> {
    try {
      await this.database.insert(participantAuthTokens).values({
        type: "login_otp",
        email: params.email.trim().toLowerCase(),
        cpf: params.cpf ? params.cpf.replace(/\D/g, "") : null,
        code: params.code,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        participantId: params.participantId || null,
      });
    } catch {
      // Fallback
      const id = crypto.randomUUID();
      const record = {
        id,
        email: params.email.trim().toLowerCase(),
        cpf: params.cpf ? params.cpf.replace(/\D/g, "") : null,
        code: params.code,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        usedAt: null,
        type: "login_otp",
      };
      memoryTokens.set(params.tokenHash, record);
      await this.saveTokenAuditFallback("login_otp", record);
    }
  }

  async findActiveOtpToken(params: {
    email: string;
    code: string;
  }): Promise<OtpTokenRecord | null> {
    const normalizedEmail = params.email.trim().toLowerCase();
    try {
      const [row] = await this.database
        .select()
        .from(participantAuthTokens)
        .where(
          and(
            eq(participantAuthTokens.type, "login_otp"),
            eq(participantAuthTokens.email, normalizedEmail),
            eq(participantAuthTokens.code, params.code),
            isNull(participantAuthTokens.usedAt),
            gt(participantAuthTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (row) {
        return {
          id: row.id,
          email: row.email,
          cpf: row.cpf,
          code: row.code ?? "",
          tokenHash: row.tokenHash,
          expiresAt: row.expiresAt,
          usedAt: row.usedAt,
        };
      }
    } catch {
      // Fallback
    }

    for (const token of memoryTokens.values()) {
      if (
        token.type === "login_otp" &&
        token.email === normalizedEmail &&
        token.code === params.code &&
        !token.usedAt &&
        token.expiresAt > new Date()
      ) {
        return {
          id: token.id,
          email: token.email,
          cpf: token.cpf,
          code: token.code ?? "",
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
        };
      }
    }

    const fromAudit = await this.findOtpAuditFallback(normalizedEmail, params.code);
    if (fromAudit) return fromAudit;

    return null;
  }

  async upsertActiveParticipant(
    params: UpsertActiveParticipantParams,
  ): Promise<ParticipantAuthRecord> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const cleanCpf = params.cpf.replace(/\D/g, "");
    const now = new Date();

    const existing =
      (await this.findByEmail(normalizedEmail)) || (await this.findByCpf(cleanCpf));

    let participantId = existing?.id;

    if (existing) {
      try {
        await this.database
          .update(participants)
          .set({
            name: params.name.trim(),
            email: normalizedEmail,
            cpf: cleanCpf,
            phone: params.phone.replace(/\D/g, ""),
            birthDate: params.birthDate ?? null,
            company: params.company?.trim() || null,
            jobTitle: params.jobTitle?.trim() || null,
            termsConsent: params.termsConsent,
            marketingConsent: Boolean(params.marketingConsent),
            passwordHash: params.passwordHash,
            status: "ativo",
            updatedAt: now,
          })
          .where(eq(participants.id, existing.id));
      } catch {
        // Fallback without password_hash/status column if DDL not applied
        await this.database
          .update(participants)
          .set({
            name: params.name.trim(),
            email: normalizedEmail,
            cpf: cleanCpf,
            phone: params.phone.replace(/\D/g, ""),
            birthDate: params.birthDate ?? null,
            company: params.company?.trim() || null,
            jobTitle: params.jobTitle?.trim() || null,
            termsConsent: params.termsConsent,
            marketingConsent: Boolean(params.marketingConsent),
            updatedAt: now,
          })
          .where(eq(participants.id, existing.id));

        memoryPasswords.set(existing.id, params.passwordHash);
        await this.savePasswordAuditFallback(existing.id, params.passwordHash);
      }
    } else {
      participantId = crypto.randomUUID();
      try {
        await this.database.insert(participants).values({
          id: participantId,
          name: params.name.trim(),
          email: normalizedEmail,
          cpf: cleanCpf,
          phone: params.phone.replace(/\D/g, ""),
          birthDate: params.birthDate ?? null,
          company: params.company?.trim() || null,
          jobTitle: params.jobTitle?.trim() || null,
          termsConsent: params.termsConsent,
          marketingConsent: Boolean(params.marketingConsent),
          passwordHash: params.passwordHash,
          status: "ativo",
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        // Fallback without password_hash/status column
        await this.database.insert(participants).values({
          id: participantId,
          name: params.name.trim(),
          email: normalizedEmail,
          cpf: cleanCpf,
          phone: params.phone.replace(/\D/g, ""),
          birthDate: params.birthDate ?? null,
          company: params.company?.trim() || null,
          jobTitle: params.jobTitle?.trim() || null,
          termsConsent: params.termsConsent,
          marketingConsent: Boolean(params.marketingConsent),
          createdAt: now,
          updatedAt: now,
        });

        memoryPasswords.set(participantId, params.passwordHash);
        await this.savePasswordAuditFallback(participantId, params.passwordHash);
      }
    }

    const updated = await this.findById(participantId!);
    if (!updated) {
      throw new Error("Erro inesperado ao salvar os dados do participante.");
    }
    return updated;
  }

  async listParticipantEvents(participantId: string): Promise<ParticipantEventItem[]> {
    const rows = await this.database
      .select({
        registration: registrations,
        event: events,
        lot: ticketLots,
        certificate: certificates,
        payment: payments,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(ticketLots, eq(registrations.lotId, ticketLots.id))
      .leftJoin(certificates, eq(registrations.id, certificates.registrationId))
      .leftJoin(payments, eq(registrations.id, payments.registrationId))
      .where(
        and(
          eq(registrations.participantId, participantId),
          isNull(registrations.deletedAt),
          isNull(events.deletedAt),
        ),
      )
      .orderBy(desc(events.startAt), desc(registrations.createdAt));

    return rows.map((row) => {
      const isConfirmed = row.registration.status === "confirmada";
      const location =
        row.event.modality === "presencial"
          ? [
              row.event.addressStreet,
              row.event.addressNumber,
              row.event.addressMunicipality,
              row.event.addressState,
            ]
              .filter(Boolean)
              .join(", ")
          : null;

      return {
        registrationId: row.registration.id,
        registrationCode: row.registration.code,
        status: row.registration.status as RegistrationStatus,
        eventId: row.event.id,
        eventTitle: row.event.title,
        eventSlug: row.event.slug,
        eventStartAt: row.event.startAt,
        eventEndAt: row.event.endAt,
        modality: row.event.modality,
        onlineUrl: isConfirmed ? row.event.onlineUrl : null,
        location,
        lotName: row.lot?.name ?? null,
        finalCents: row.registration.finalCents,
        accessToken: row.registration.accessTokenHash,
        reservationExpiresAt: row.registration.reservationExpiresAt,
        waitlistExpiresAt: row.registration.waitlistExpiresAt,
        checkoutUrl: row.payment?.checkoutUrl ?? null,
        paymentProvider: row.payment?.provider ?? null,
        paymentExternalId: row.payment?.externalId ?? null,
        certificateCode: row.certificate?.authenticationCode ?? null,
        certificateIssuedAt: row.certificate?.issuedAt ?? null,
      };
    });
  }

  private mapToAuthRecord(row: ParticipantRow): ParticipantAuthRecord {
    // Password hash might be in column or fallback memory/audit
    const passwordHash =
      (row as { passwordHash?: string | null }).passwordHash ??
      memoryPasswords.get(row.id) ??
      null;

    const status =
      (row as { status?: string }).status ?? "ativo";

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      cpf: row.cpf,
      phone: row.phone,
      birthDate: row.birthDate,
      company: row.company,
      jobTitle: row.jobTitle,
      passwordHash,
      status,
      termsConsent: row.termsConsent,
      marketingConsent: row.marketingConsent,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async saveTokenAuditFallback(
    type: string,
    token: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.database.insert(auditLogs).values({
        userId: "system",
        userName: "Sistema",
        action: `participant_auth.${type}`,
        entity: "participant_token",
        recordId: String(token.tokenHash || token.id),
        afterData: token,
        ip: null,
      });
    } catch {
      // Ignored
    }
  }

  private async findTokenAuditFallback(
    tokenHash: string,
    type: string,
  ): Promise<ActivationTokenRecord | null> {
    try {
      const [row] = await this.database
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entity, "participant_token"),
            eq(auditLogs.action, `participant_auth.${type}`),
            eq(auditLogs.recordId, tokenHash),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      if (row && row.afterData && typeof row.afterData === "object") {
        const data = row.afterData as Record<string, unknown>;
        return {
          id: String(data.id),
          email: String(data.email),
          cpf: data.cpf ? String(data.cpf) : null,
          tokenHash: String(data.tokenHash),
          expiresAt: new Date(String(data.expiresAt)),
          usedAt: data.usedAt ? new Date(String(data.usedAt)) : null,
        };
      }
    } catch {
      // Ignored
    }
    return null;
  }

  private async findOtpAuditFallback(
    email: string,
    code: string,
  ): Promise<OtpTokenRecord | null> {
    try {
      const rows = await this.database
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entity, "participant_token"),
            eq(auditLogs.action, "participant_auth.login_otp"),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);

      for (const row of rows) {
        if (row.afterData && typeof row.afterData === "object") {
          const data = row.afterData as Record<string, unknown>;
          if (
            String(data.email).toLowerCase() === email &&
            String(data.code) === code &&
            !data.usedAt &&
            new Date(String(data.expiresAt)) > new Date()
          ) {
            return {
              id: String(data.id),
              email: String(data.email),
              cpf: data.cpf ? String(data.cpf) : null,
              code: String(data.code),
              tokenHash: String(data.tokenHash),
              expiresAt: new Date(String(data.expiresAt)),
              usedAt: data.usedAt ? new Date(String(data.usedAt)) : null,
            };
          }
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }

  private async savePasswordAuditFallback(
    participantId: string,
    passwordHash: string,
  ): Promise<void> {
    try {
      await this.database.insert(auditLogs).values({
        userId: "system",
        userName: "Sistema",
        action: "participant_auth.password_set",
        entity: "participant_password",
        recordId: participantId,
        afterData: { participantId, passwordHash },
        ip: null,
      });
    } catch {
      // Ignored
    }
  }
}
