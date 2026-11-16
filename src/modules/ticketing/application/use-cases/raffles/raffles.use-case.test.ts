import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/@core/domain/result";
import {
  ControlEventRaffleUseCase,
  CreateEventRaffleUseCase,
  GetPublicRaffleUseCase,
} from "./raffles.use-case";
import type {
  PublicRaffleView,
  RaffleDetail,
  RaffleRepository,
} from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import type {
  AuditRecord,
  IAuditRepository,
} from "@/modules/ticketing/domain/repositories/audit-repository.interface";

describe("Raffle Use Cases", () => {
  let mockRaffleRepo: RaffleRepository;
  let mockAuditRepo: IAuditRepository;
  let auditLogs: AuditRecord[];

  const sampleDetail: RaffleDetail = {
    id: "raf-1",
    eventId: "event-1",
    eventTitle: "Summit 2026",
    title: "Sorteio Oficial",
    description: null,
    participantFilter: "presentes",
    allowRepeatWinners: false,
    animationDurationSeconds: 7,
    status: "rascunho",
    publicToken: "RAF-TOKEN123",
    currentPrizeId: "prize-1",
    showWinnersSummary: false,
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-11-16T10:00:00Z"),
    updatedAt: new Date("2026-11-16T10:00:00Z"),
    prizes: [
      {
        id: "prize-1",
        raffleId: "raf-1",
        title: "1º Prêmio: Notebook",
        description: null,
        orderIndex: 1,
        status: "pendente",
        winnerRegistrationId: null,
        winnerParticipantId: null,
        winnerName: null,
        winnerTicketCode: null,
        drawnAt: null,
        disqualificationReason: null,
      },
    ],
    manualRegistrationIds: [],
    eligibleCandidates: [],
    allConfirmedCandidates: [],
    history: [],
  };

  beforeEach(() => {
    auditLogs = [];

    mockRaffleRepo = {
      listByEvent: vi.fn(),
      findDetailById: vi.fn(),
      findPublicByToken: vi.fn(),
      create: vi.fn().mockResolvedValue(Result.ok(sampleDetail)),
      update: vi.fn(),
      delete: vi.fn(),
      executeAction: vi.fn().mockResolvedValue(
        Result.ok({
          ...sampleDetail,
          status: "em_andamento",
        }),
      ),
    } as unknown as RaffleRepository;

    mockAuditRepo = {
      write: vi.fn(async (record: AuditRecord) => {
        auditLogs.push(record);
      }),
      list: vi.fn(),
    };
  });

  it("cria sorteio com token público e registra auditoria", async () => {
    const useCase = new CreateEventRaffleUseCase({
      raffleRepository: mockRaffleRepo,
      auditRepository: mockAuditRepo,
    });

    const result = await useCase.execute({
      eventId: "event-1",
      title: "Sorteio Oficial",
      participantFilter: "presentes",
      allowRepeatWinners: false,
      prizes: [{ title: "1º Prêmio: Notebook" }],
      actorId: "user-1",
      actorName: "Organizador",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(mockRaffleRepo.create).toHaveBeenCalledTimes(1);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "raffle.created",
      entity: "raffle",
      recordId: "raf-1",
    });
  });

  it("executa ação de controle do sorteio e registra auditoria", async () => {
    const useCase = new ControlEventRaffleUseCase({
      raffleRepository: mockRaffleRepo,
      auditRepository: mockAuditRepo,
    });

    const result = await useCase.execute({
      eventId: "event-1",
      raffleId: "raf-1",
      action: "draw_prize",
      prizeId: "prize-1",
      actorId: "user-1",
      actorName: "Organizador",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(mockRaffleRepo.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "draw_prize",
        prizeId: "prize-1",
      }),
    );
    expect(auditLogs[0]).toMatchObject({
      action: "raffle.draw_prize",
      recordId: "raf-1",
    });
  });

  it("retorna visão pública do telão por token", async () => {
    const publicView: PublicRaffleView = {
      id: "raf-1",
      eventId: "event-1",
      eventTitle: "Summit 2026",
      title: "Sorteio Oficial",
      description: null,
      status: "em_andamento",
      animationDurationSeconds: 7,
      currentPrizeId: "prize-1",
      showWinnersSummary: false,
      totalEligibleCount: 25,
      candidatePool: [{ name: "Ana Silva", ticketCode: "INS-001" }],
      prizes: [
        {
          id: "prize-1",
          title: "1º Prêmio: Notebook",
          description: null,
          orderIndex: 1,
          status: "sorteado",
          winnerName: "Ana Silva",
          winnerTicketCode: "INS-001",
          drawnAt: new Date(),
        },
      ],
      updatedAt: new Date(),
    };

    vi.mocked(mockRaffleRepo.findPublicByToken).mockResolvedValueOnce(publicView);

    const useCase = new GetPublicRaffleUseCase({
      raffleRepository: mockRaffleRepo,
    });

    const result = await useCase.execute({ token: "RAF-TOKEN123" });
    expect(result.isSuccess).toBe(true);
    expect(result.value.title).toBe("Sorteio Oficial");
    expect(result.value.prizes[0].winnerName).toBe("Ana Silva");
  });
});
