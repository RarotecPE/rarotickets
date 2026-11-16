import { describe, expect, it } from "vitest";
import { Raffle, type RaffleCandidate } from "./raffle.entity";

describe("Raffle Entity", () => {
  it("cria um sorteio válido com prêmios ordenados", () => {
    const result = Raffle.create({
      eventId: "event-1",
      title: "Sorteio Oficial de Encerramento",
      description: "Prêmios especiais para participantes",
      participantFilter: "presentes",
      allowRepeatWinners: false,
      animationDurationSeconds: 8,
      publicToken: "token-123",
      prizes: [
        { title: "1º Prêmio: Notebook Dell" },
        { title: "2º Prêmio: Monitor 27 polegadas" },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.attributes.title).toBe("Sorteio Oficial de Encerramento");
    expect(result.value.attributes.prizes).toHaveLength(2);
    expect(result.value.attributes.prizes[0].orderIndex).toBe(1);
    expect(result.value.attributes.prizes[1].orderIndex).toBe(2);
  });

  it("rejeita sorteio sem prêmios ou com filtro manual vazio", () => {
    const noPrizes = Raffle.create({
      eventId: "event-1",
      title: "Sorteio Sem Prêmios",
      participantFilter: "todos",
      publicToken: "token-123",
      prizes: [],
    });
    expect(noPrizes.isFailure).toBe(true);
    expect(noPrizes.error.code).toBe("RAFFLE_PRIZES_REQUIRED");

    const emptyManual = Raffle.create({
      eventId: "event-1",
      title: "Sorteio Manual",
      participantFilter: "manual",
      publicToken: "token-123",
      prizes: [{ title: "1º Prêmio" }],
      manualRegistrationIds: [],
    });
    expect(emptyManual.isFailure).toBe(true);
    expect(emptyManual.error.code).toBe("RAFFLE_MANUAL_PARTICIPANTS_REQUIRED");
  });

  it("filtra corretamente os participantes elegíveis conforme os critérios e repetição", () => {
    const candidates: RaffleCandidate[] = [
      {
        registrationId: "reg-1",
        registrationCode: "INS-001",
        participantId: "p-1",
        participantName: "Alice Pagante Presente",
        participantEmail: "alice@example.com",
        registrationStatus: "confirmada",
        finalCents: 15000,
        lotName: "1º Lote",
        checkedIn: true,
        checkInAt: new Date(),
      },
      {
        registrationId: "reg-2",
        registrationCode: "INS-002",
        participantId: "p-2",
        participantName: "Bruno Cortesia Presente",
        participantEmail: "bruno@example.com",
        registrationStatus: "confirmada",
        finalCents: 0,
        lotName: "Cortesia",
        checkedIn: true,
        checkInAt: new Date(),
      },
      {
        registrationId: "reg-3",
        registrationCode: "INS-003",
        participantId: "p-3",
        participantName: "Carla Pagante Ausente",
        participantEmail: "carla@example.com",
        registrationStatus: "confirmada",
        finalCents: 15000,
        lotName: "1º Lote",
        checkedIn: false,
        checkInAt: null,
      },
      {
        registrationId: "reg-4",
        registrationCode: "INS-004",
        participantId: "p-4",
        participantName: "Daniel Pendente",
        participantEmail: "daniel@example.com",
        registrationStatus: "pendente",
        finalCents: 15000,
        lotName: "1º Lote",
        checkedIn: false,
        checkInAt: null,
      },
    ];

    // Filtro: todos confirmados
    const allConfirmed = Raffle.filterEligibleCandidates({
      candidates,
      filter: "todos",
      allowRepeatWinners: true,
      manualRegistrationIds: [],
      alreadyWonParticipantIds: [],
      alreadyWonRegistrationIds: [],
    });
    expect(allConfirmed.map((c) => c.registrationId)).toEqual(["reg-1", "reg-2", "reg-3"]);

    // Filtro: pagantes
    const paidOnly = Raffle.filterEligibleCandidates({
      candidates,
      filter: "pagantes",
      allowRepeatWinners: true,
      manualRegistrationIds: [],
      alreadyWonParticipantIds: [],
      alreadyWonRegistrationIds: [],
    });
    expect(paidOnly.map((c) => c.registrationId)).toEqual(["reg-1", "reg-3"]);

    // Filtro: presentes
    const presentOnly = Raffle.filterEligibleCandidates({
      candidates,
      filter: "presentes",
      allowRepeatWinners: true,
      manualRegistrationIds: [],
      alreadyWonParticipantIds: [],
      alreadyWonRegistrationIds: [],
    });
    expect(presentOnly.map((c) => c.registrationId)).toEqual(["reg-1", "reg-2"]);

    // Filtro: presentes sem repetir ganhadores (p-1 já ganhou)
    const presentNoRepeat = Raffle.filterEligibleCandidates({
      candidates,
      filter: "presentes",
      allowRepeatWinners: false,
      manualRegistrationIds: [],
      alreadyWonParticipantIds: ["p-1"],
      alreadyWonRegistrationIds: ["reg-1"],
    });
    expect(presentNoRepeat.map((c) => c.registrationId)).toEqual(["reg-2"]);

    // Filtro: manual
    const manualOnly = Raffle.filterEligibleCandidates({
      candidates,
      filter: "manual",
      allowRepeatWinners: false,
      manualRegistrationIds: ["reg-2", "reg-3"],
      alreadyWonParticipantIds: [],
      alreadyWonRegistrationIds: [],
    });
    expect(manualOnly.map((c) => c.registrationId)).toEqual(["reg-2", "reg-3"]);
  });
});
