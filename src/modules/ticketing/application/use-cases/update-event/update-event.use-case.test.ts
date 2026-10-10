import { describe, expect, it, vi, beforeEach } from "vitest";
import { UpdateEventUseCase } from "./update-event.use-case";
import type { EventReadModel, EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { IAuditRepository, AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";

function createFakeEventReadModel(overrides?: Partial<EventReadModel["props"]>): EventReadModel {
  return {
    id: "event-123",
    props: {
      title: "Workshop de TypeScript",
      description: "Um workshop completo sobre TypeScript e boas práticas de arquitetura.",
      summary: "Workshop prático sobre TypeScript moderno.",
      slug: "workshop-de-typescript",
      bannerUrl: null,
      modality: "online",
      chargeType: "gratuito",
      status: "rascunho",
      startAt: new Date("2026-11-10T14:00:00.000Z"),
      endAt: new Date("2026-11-10T18:00:00.000Z"),
      registrationStartAt: new Date("2026-10-01T00:00:00.000Z"),
      registrationEndAt: new Date("2026-11-09T23:59:59.000Z"),
      maxCapacity: 100,
      allowsWaitlist: true,
      onlineUrl: "https://zoom.us/j/123456",
      address: null,
      responsibleName: "Organizador Chefe",
      responsibleEmail: "organizador@exemplo.com",
      createdByGlobalUserId: "user-1",
      certificateEnabled: true,
      workloadHours: 4,
      certificateDescription: "Certificado de conclusão do workshop.",
      deletedAt: null,
      ...overrides,
    },
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    capacity: { confirmed: 0, reserved: 0, waitlisted: 0 },
    lots: [],
    formFields: [],
    activities: [],
  };
}

describe("UpdateEventUseCase", () => {
  let mockEventRepo: EventRepository;
  let mockAuditRepo: IAuditRepository;
  let mockIdGen: IIdGenerator;
  let auditLogs: AuditRecord[];
  let currentEvent: EventReadModel | null;

  beforeEach(() => {
    auditLogs = [];
    currentEvent = createFakeEventReadModel();

    mockEventRepo = {
      listPublic: vi.fn(),
      getPublicBySlug: vi.fn(),
      listManaged: vi.fn(),
      findById: vi.fn(),
      getManagedById: vi.fn(async () => currentEvent),
      create: vi.fn(),
      update: vi.fn(async (params) => {
        if (!currentEvent) return null;
        return {
          ...currentEvent,
          props: { ...params.props },
          updatedAt: params.updatedAt,
        };
      }),
      transition: vi.fn(),
    } as unknown as EventRepository;

    mockAuditRepo = {
      write: vi.fn(async (record) => {
        auditLogs.push(record);
      }),
    } as unknown as IAuditRepository;

    mockIdGen = {
      next: vi.fn(() => "generated-id-1"),
    };
  });

  it("atualiza com sucesso um evento com status rascunho", async () => {
    const useCase = new UpdateEventUseCase({
      eventRepository: mockEventRepo,
      auditRepository: mockAuditRepo,
      idGenerator: mockIdGen,
    });

    const result = await useCase.execute({
      eventId: "event-123",
      userId: "user-1",
      userName: "Operador Teste",
      canViewAll: false,
      ip: "127.0.0.1",
      props: {
        title: "Workshop de TypeScript Avançado",
        description: "Nova descrição detalhada com mais de 20 caracteres necessários.",
        summary: "Novo resumo curto do evento atualizado.",
        slug: "workshop-de-typescript-avancado",
        bannerUrl: null,
        modality: "online",
        chargeType: "gratuito",
        startAt: new Date("2026-11-10T14:00:00.000Z"),
        endAt: new Date("2026-11-10T18:00:00.000Z"),
        registrationStartAt: new Date("2026-10-01T00:00:00.000Z"),
        registrationEndAt: new Date("2026-11-09T23:59:59.000Z"),
        maxCapacity: 150,
        allowsWaitlist: true,
        onlineUrl: "https://zoom.us/j/999999",
        address: null,
        responsibleName: "Organizador Chefe",
        responsibleEmail: "organizador@exemplo.com",
        certificateEnabled: true,
        workloadHours: 4,
        certificateDescription: "Certificado de conclusão.",
      },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.props.title).toBe("Workshop de TypeScript Avançado");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("event.updated");
  });

  it("permite atualizar eventos com outros status não finalizados (ex: agendado, inscricoes_abertas)", async () => {
    currentEvent = createFakeEventReadModel({ status: "inscricoes_abertas" });

    const useCase = new UpdateEventUseCase({
      eventRepository: mockEventRepo,
      auditRepository: mockAuditRepo,
      idGenerator: mockIdGen,
    });

    const result = await useCase.execute({
      eventId: "event-123",
      userId: "user-1",
      userName: "Operador Teste",
      canViewAll: false,
      ip: null,
      props: {
        title: "Workshop de TypeScript Aberto",
        description: "Descrição detalhada do evento que continua aceitando alterações.",
        summary: "Resumo curto válido com mais de dez letras.",
        slug: "workshop-aberto",
        bannerUrl: null,
        modality: "online",
        chargeType: "gratuito",
        startAt: new Date("2026-11-10T14:00:00.000Z"),
        endAt: new Date("2026-11-10T18:00:00.000Z"),
        registrationStartAt: new Date("2026-10-01T00:00:00.000Z"),
        registrationEndAt: new Date("2026-11-09T23:59:59.000Z"),
        maxCapacity: 200,
        allowsWaitlist: false,
        onlineUrl: "https://zoom.us/j/999999",
        address: null,
        responsibleName: "Organizador Chefe",
        responsibleEmail: "organizador@exemplo.com",
        certificateEnabled: false,
        workloadHours: 0,
        certificateDescription: null,
      },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.props.status).toBe("inscricoes_abertas");
  });

  it("bloqueia edição de eventos finalizados com erro descritivo", async () => {
    currentEvent = createFakeEventReadModel({ status: "finalizado" });

    const useCase = new UpdateEventUseCase({
      eventRepository: mockEventRepo,
      auditRepository: mockAuditRepo,
      idGenerator: mockIdGen,
    });

    const result = await useCase.execute({
      eventId: "event-123",
      userId: "user-1",
      userName: "Operador Teste",
      canViewAll: false,
      ip: null,
      props: {
        title: "Tentativa de Edição",
        description: "Descrição de teste para evento finalizado bloqueado.",
        summary: "Resumo curto de teste válido.",
        slug: "tentativa-edicao",
        bannerUrl: null,
        modality: "online",
        chargeType: "gratuito",
        startAt: new Date("2026-11-10T14:00:00.000Z"),
        endAt: new Date("2026-11-10T18:00:00.000Z"),
        registrationStartAt: new Date("2026-10-01T00:00:00.000Z"),
        registrationEndAt: new Date("2026-11-09T23:59:59.000Z"),
        maxCapacity: 100,
        allowsWaitlist: false,
        onlineUrl: "https://zoom.us/j/123",
        address: null,
        responsibleName: "Organizador Chefe",
        responsibleEmail: "organizador@exemplo.com",
        certificateEnabled: false,
        workloadHours: 0,
        certificateDescription: null,
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe("Eventos finalizados não podem ser editados.");
    expect(auditLogs).toHaveLength(0);
  });

  it("falha quando o evento não é encontrado", async () => {
    currentEvent = null;

    const useCase = new UpdateEventUseCase({
      eventRepository: mockEventRepo,
      auditRepository: mockAuditRepo,
      idGenerator: mockIdGen,
    });

    const result = await useCase.execute({
      eventId: "inexistente",
      userId: "user-1",
      userName: "Operador Teste",
      canViewAll: false,
      ip: null,
      props: {
        title: "Evento Fantasma",
        description: "Descrição detalhada do evento que não existe no banco.",
        summary: "Resumo do evento inexistente.",
        slug: "evento-fantasma",
        bannerUrl: null,
        modality: "online",
        chargeType: "gratuito",
        startAt: new Date("2026-11-10T14:00:00.000Z"),
        endAt: new Date("2026-11-10T18:00:00.000Z"),
        registrationStartAt: new Date("2026-10-01T00:00:00.000Z"),
        registrationEndAt: new Date("2026-11-09T23:59:59.000Z"),
        maxCapacity: 100,
        allowsWaitlist: false,
        onlineUrl: "https://zoom.us/j/123",
        address: null,
        responsibleName: "Organizador Chefe",
        responsibleEmail: "organizador@exemplo.com",
        certificateEnabled: false,
        workloadHours: 0,
        certificateDescription: null,
      },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("não encontrado");
  });
});

