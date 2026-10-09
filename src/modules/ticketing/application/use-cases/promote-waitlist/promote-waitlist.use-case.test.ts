import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { EnqueueMessageParams } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type {
  FindNextWaitlistedParams,
  IWaitlistPromotionRepository,
  PromoteNextWaitlistedParams,
  WaitlistCandidate,
  WaitlistPromotionResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { PromoteWaitlistUseCase } from "./promote-waitlist.use-case";

const at = new Date("2026-10-07T12:00:00.000Z");

function createCandidate(index: number): WaitlistCandidate {
  return {
    registrationId: `registration-${index}`,
    eventId: "event-1",
    registrationCode: `RT-2026-${String(index).padStart(4, "0")}`,
    eventTitle: "Conferência Raro",
    eventSlug: "conferencia-raro",
    eventStartAt: new Date("2026-12-10T12:00:00.000Z"),
    chargeType: "pago",
    participantName: `Participante ${index}`,
    participantEmail: `participante${index}@example.com`,
    participantPhone: `+558199999000${index}`,
    createdAt: new Date(at.getTime() + index * 1_000),
  };
}

describe("PromoteWaitlistUseCase", () => {
  let candidates: WaitlistCandidate[];
  let queuedMessages: EnqueueMessageParams[];
  let auditRecords: AuditRecord[];
  let repository: IWaitlistPromotionRepository;
  let findNextWaitlisted: (
    params: FindNextWaitlistedParams,
  ) => Promise<WaitlistCandidate | null>;
  let issueAccessToken: (params: { registrationId: string }) => {
    rawToken: string;
    hash: string;
  };
  let useCase: PromoteWaitlistUseCase;

  beforeEach(() => {
    candidates = [createCandidate(1), createCandidate(2), createCandidate(3)];
    queuedMessages = [];
    auditRecords = [];
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.registrationId, candidate]),
    );
    findNextWaitlisted = vi.fn(
      async (
        params: FindNextWaitlistedParams,
      ): Promise<WaitlistCandidate | null> =>
        params.eventId === "event-1" ? (candidates.shift() ?? null) : null,
    );
    const promoteNextWaitlisted = vi.fn(
      async (
        params: PromoteNextWaitlistedParams,
      ): Promise<WaitlistPromotionResult | null> => {
        const candidate = candidateById.get(params.registrationId);
        return candidate
          ? {
              ...candidate,
              status: "pendente",
              originalCents: 12_000,
              finalCents: 12_000,
              waitlistExpiresAt: params.expiresAt,
            }
          : null;
      },
    );
    repository = { findNextWaitlisted, promoteNextWaitlisted };
    issueAccessToken = vi.fn(({ registrationId }: { registrationId: string }) => ({
      rawToken: `access-${registrationId}`,
      hash: `hash-${registrationId}`,
    }));
    useCase = new PromoteWaitlistUseCase({
      registrationRepository: repository,
      credentialProvider: { issueAccessToken },
      outboxRepository: {
        enqueue: async (message) => {
          queuedMessages.push(message);
        },
      },
      auditRepository: {
        write: async (record) => {
          auditRecords.push(record);
        },
      },
      paymentProvider: "mock",
      publicBaseUrl: "https://tickets.example.com/",
    });
  });

  it("promove na ordem retornada pela fila e agenda notificações com prazo de 24 horas", async () => {
    const result = await useCase.execute({
      eventId: "event-1",
      at,
      maxPromotions: 2,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      promotedCount: 2,
      registrationCodes: ["RT-2026-0001", "RT-2026-0002"],
    });
    expect(findNextWaitlisted).toHaveBeenCalledTimes(2);
    expect(issueAccessToken).toHaveBeenNthCalledWith(1, {
      registrationId: "registration-1",
    });
    expect(issueAccessToken).toHaveBeenNthCalledWith(2, {
      registrationId: "registration-2",
    });
    expect(queuedMessages).toHaveLength(4);
    expect(queuedMessages.map((message) => message.channel)).toEqual([
      "email",
      "whatsapp",
      "email",
      "whatsapp",
    ]);
    for (const message of queuedMessages) {
      expect(message.template).toBe("waitlist-promoted");
      expect(message.payload.waitlistExpiresAt).toBe(
        new Date(at.getTime() + 24 * 60 * 60 * 1_000).toISOString(),
      );
    }
    expect(queuedMessages[0]?.payload.participantUrl).toBe(
      "https://tickets.example.com/ingressos/access-registration-1",
    );
    expect(auditRecords).toHaveLength(2);
    expect(auditRecords[0]?.action).toBe("registration.waitlist_promoted");
  });

  it("rejeita limites inválidos antes de consultar ou alterar a fila", async () => {
    const result = await useCase.execute({
      eventId: "event-1",
      at,
      maxPromotions: 101,
    });

    expect(result.isFailure).toBe(true);
    expect(findNextWaitlisted).not.toHaveBeenCalled();
    expect(queuedMessages).toHaveLength(0);
    expect(auditRecords).toHaveLength(0);
  });
});
