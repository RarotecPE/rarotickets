import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Result } from "@/@core/domain/result";
import type { DomainError } from "@/@core/domain/errors/domain-error.base";
import {
  Raffle,
  RaffleRuleError,
  type RaffleCandidate,
} from "@/modules/ticketing/domain/raffles/entities/raffle.entity";
import {
  RaffleRepository,
  type ExecuteRaffleActionParams,
  type PublicRaffleView,
  type RaffleDetail,
  type RaffleDrawHistoryItem,
  type RafflePrizeReadModel,
  type RaffleSummary,
} from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import {
  checkins,
  events,
  participants,
  raffleDrawHistory,
  raffleManualParticipants,
  rafflePrizes,
  raffles,
  registrations,
  ticketLots,
} from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleRaffleRepositoryDependencies = { database: Database };

export class DrizzleRaffleRepository extends RaffleRepository {
  private readonly database: Database;

  constructor(dependencies: DrizzleRaffleRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  private async verifyEventAccess(params: {
    eventId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<{ id: string; title: string } | null> {
    const conditions = [
      eq(events.id, params.eventId),
      isNull(events.deletedAt),
    ];
    if (!params.canManageAll) {
      conditions.push(eq(events.createdByGlobalUserId, params.actorId));
    }

    const [eventRow] = await this.database
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(and(...conditions))
      .limit(1);

    return eventRow ?? null;
  }

  private async loadConfirmedCandidatesForEvent(
    eventId: string,
  ): Promise<RaffleCandidate[]> {
    const rows = await this.database
      .select({
        registrationId: registrations.id,
        registrationCode: registrations.code,
        participantId: participants.id,
        participantName: participants.name,
        participantEmail: participants.email,
        registrationStatus: registrations.status,
        finalCents: registrations.finalCents,
        lotName: ticketLots.name,
        checkInHappenedAt: checkins.happenedAt,
      })
      .from(registrations)
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(ticketLots, eq(registrations.lotId, ticketLots.id))
      .leftJoin(
        checkins,
        and(
          eq(registrations.id, checkins.registrationId),
          eq(checkins.type, "normal"),
        ),
      )
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.status, "confirmada"),
          isNull(registrations.deletedAt),
        ),
      )
      .orderBy(asc(participants.name));

    return rows.map((row) => ({
      registrationId: row.registrationId,
      registrationCode: row.registrationCode,
      participantId: row.participantId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      registrationStatus: row.registrationStatus,
      finalCents: row.finalCents,
      lotName: row.lotName ?? null,
      checkedIn: row.checkInHappenedAt !== null,
      checkInAt: row.checkInHappenedAt ?? null,
    }));
  }

  async listByEvent(params: {
    eventId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleSummary[]> {
    const eventRow = await this.verifyEventAccess(params);
    if (!eventRow) return [];

    const raffleRows = await this.database
      .select()
      .from(raffles)
      .where(eq(raffles.eventId, params.eventId))
      .orderBy(desc(raffles.createdAt));

    if (!raffleRows.length) return [];

    const raffleIds = raffleRows.map((r) => r.id);
    const prizeRows = await this.database
      .select()
      .from(rafflePrizes)
      .where(inArray(rafflePrizes.raffleId, raffleIds));

    return raffleRows.map((r) => {
      const prizes = prizeRows.filter((p) => p.raffleId === r.id);
      const drawnCount = prizes.filter(
        (p) => p.status === "sorteado" || p.status === "sorteando",
      ).length;
      return {
        id: r.id,
        eventId: r.eventId,
        title: r.title,
        description: r.description ?? null,
        participantFilter: r.participantFilter,
        allowRepeatWinners: r.allowRepeatWinners,
        animationDurationSeconds: r.animationDurationSeconds,
        status: r.status,
        publicToken: r.publicToken,
        currentPrizeId: r.currentPrizeId ?? null,
        showWinnersSummary: r.showWinnersSummary,
        prizesCount: prizes.length,
        drawnPrizesCount: drawnCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }

  async findDetailById(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleDetail | null> {
    const eventRow = await this.verifyEventAccess(params);
    if (!eventRow) return null;

    const [raffleRow] = await this.database
      .select()
      .from(raffles)
      .where(
        and(
          eq(raffles.id, params.raffleId),
          eq(raffles.eventId, params.eventId),
        ),
      )
      .limit(1);

    if (!raffleRow) return null;

    const [prizeRows, manualRows, historyRows, allConfirmedCandidates] =
      await Promise.all([
        this.database
          .select()
          .from(rafflePrizes)
          .where(eq(rafflePrizes.raffleId, raffleRow.id))
          .orderBy(asc(rafflePrizes.orderIndex)),
        this.database
          .select()
          .from(raffleManualParticipants)
          .where(eq(raffleManualParticipants.raffleId, raffleRow.id)),
        this.database
          .select()
          .from(raffleDrawHistory)
          .where(eq(raffleDrawHistory.raffleId, raffleRow.id))
          .orderBy(desc(raffleDrawHistory.createdAt)),
        this.loadConfirmedCandidatesForEvent(params.eventId),
      ]);

    const prizesById = new Map(prizeRows.map((p) => [p.id, p]));
    const manualRegistrationIds = manualRows.map((m) => m.registrationId);

    const wonParticipantIds = prizeRows
      .filter((p) => p.winnerParticipantId !== null)
      .map((p) => p.winnerParticipantId!);
    const wonRegistrationIds = prizeRows
      .filter((p) => p.winnerRegistrationId !== null)
      .map((p) => p.winnerRegistrationId!);
    const disqualifiedRegistrationIds = historyRows
      .filter((h) => h.action === "anulado" && h.winnerRegistrationId !== null)
      .map((h) => h.winnerRegistrationId!);

    const eligibleCandidates = Raffle.filterEligibleCandidates({
      candidates: allConfirmedCandidates,
      filter: raffleRow.participantFilter,
      allowRepeatWinners: raffleRow.allowRepeatWinners,
      manualRegistrationIds,
      alreadyWonParticipantIds: wonParticipantIds,
      alreadyWonRegistrationIds: [
        ...wonRegistrationIds,
        ...disqualifiedRegistrationIds,
      ],
    });

    const prizes: RafflePrizeReadModel[] = prizeRows.map((p) => ({
      id: p.id,
      raffleId: p.raffleId,
      title: p.title,
      description: p.description ?? null,
      orderIndex: p.orderIndex,
      status: p.status,
      winnerRegistrationId: p.winnerRegistrationId ?? null,
      winnerParticipantId: p.winnerParticipantId ?? null,
      winnerName: p.winnerName ?? null,
      winnerTicketCode: p.winnerTicketCode ?? null,
      drawnAt: p.drawnAt ?? null,
      disqualificationReason: p.disqualificationReason ?? null,
    }));

    const history: RaffleDrawHistoryItem[] = historyRows.map((h) => ({
      id: h.id,
      raffleId: h.raffleId,
      prizeId: h.prizeId,
      prizeTitle: prizesById.get(h.prizeId)?.title ?? "Prêmio",
      winnerRegistrationId: h.winnerRegistrationId ?? null,
      winnerName: h.winnerName,
      winnerTicketCode: h.winnerTicketCode ?? null,
      action:
        h.action === "anulado"
          ? "anulado"
          : h.action === "reiniciado"
            ? "reiniciado"
            : "sorteado",
      reason: h.reason ?? null,
      drawnByUserName: h.drawnByUserName ?? null,
      createdAt: h.createdAt,
    }));

    return {
      id: raffleRow.id,
      eventId: raffleRow.eventId,
      eventTitle: eventRow.title,
      title: raffleRow.title,
      description: raffleRow.description ?? null,
      participantFilter: raffleRow.participantFilter,
      allowRepeatWinners: raffleRow.allowRepeatWinners,
      animationDurationSeconds: raffleRow.animationDurationSeconds,
      status: raffleRow.status,
      publicToken: raffleRow.publicToken,
      currentPrizeId: raffleRow.currentPrizeId ?? null,
      showWinnersSummary: raffleRow.showWinnersSummary,
      startedAt: raffleRow.startedAt ?? null,
      completedAt: raffleRow.completedAt ?? null,
      createdAt: raffleRow.createdAt,
      updatedAt: raffleRow.updatedAt,
      prizes,
      manualRegistrationIds,
      eligibleCandidates,
      allConfirmedCandidates,
      history,
    };
  }

  async findPublicByToken(token: string): Promise<PublicRaffleView | null> {
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    const [row] = await this.database
      .select({
        raffle: raffles,
        eventTitle: events.title,
      })
      .from(raffles)
      .innerJoin(events, eq(raffles.eventId, events.id))
      .where(
        and(eq(raffles.publicToken, cleanToken), isNull(events.deletedAt)),
      )
      .limit(1);

    if (!row) return null;

    const [prizeRows, manualRows, allConfirmedCandidates] = await Promise.all([
      this.database
        .select()
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, row.raffle.id))
        .orderBy(asc(rafflePrizes.orderIndex)),
      this.database
        .select()
        .from(raffleManualParticipants)
        .where(eq(raffleManualParticipants.raffleId, row.raffle.id)),
      this.loadConfirmedCandidatesForEvent(row.raffle.eventId),
    ]);

    const manualRegistrationIds = manualRows.map((m) => m.registrationId);
    const wonParticipantIds = prizeRows
      .filter((p) => p.winnerParticipantId !== null)
      .map((p) => p.winnerParticipantId!);
    const wonRegistrationIds = prizeRows
      .filter((p) => p.winnerRegistrationId !== null)
      .map((p) => p.winnerRegistrationId!);

    const baseCandidates = Raffle.filterEligibleCandidates({
      candidates: allConfirmedCandidates,
      filter: row.raffle.participantFilter,
      allowRepeatWinners: true,
      manualRegistrationIds,
      alreadyWonParticipantIds: [],
      alreadyWonRegistrationIds: [],
    });

    const eligibleRemaining = Raffle.filterEligibleCandidates({
      candidates: allConfirmedCandidates,
      filter: row.raffle.participantFilter,
      allowRepeatWinners: row.raffle.allowRepeatWinners,
      manualRegistrationIds,
      alreadyWonParticipantIds: wonParticipantIds,
      alreadyWonRegistrationIds: wonRegistrationIds,
    });

    const poolSource =
      eligibleRemaining.length >= 3 ? eligibleRemaining : baseCandidates;
    const candidatePool = poolSource.slice(0, 150).map((c) => ({
      name: c.participantName,
      ticketCode: c.registrationCode,
    }));

    return {
      id: row.raffle.id,
      eventId: row.raffle.eventId,
      eventTitle: row.eventTitle,
      title: row.raffle.title,
      description: row.raffle.description ?? null,
      status: row.raffle.status,
      animationDurationSeconds: row.raffle.animationDurationSeconds,
      currentPrizeId: row.raffle.currentPrizeId ?? null,
      showWinnersSummary: row.raffle.showWinnersSummary,
      totalEligibleCount: eligibleRemaining.length,
      candidatePool,
      prizes: prizeRows.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        orderIndex: p.orderIndex,
        status: p.status,
        winnerName: p.winnerName ?? null,
        winnerTicketCode: p.winnerTicketCode ?? null,
        drawnAt: p.drawnAt ?? null,
      })),
      updatedAt: row.raffle.updatedAt,
    };
  }

  async create(params: {
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>> {
    const props = params.raffle.attributes;
    const eventRow = await this.verifyEventAccess({
      eventId: props.eventId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!eventRow) {
      return Result.fail(
        new RaffleRuleError({
          code: "EVENT_NOT_FOUND",
          message: "Evento não encontrado ou você não tem permissão para gerenciá-lo.",
        }),
      );
    }

    const createdRaffleId = await this.database.transaction(async (tx) => {
      const [insertedRaffle] = await tx
        .insert(raffles)
        .values({
          id: params.raffle.id.toString(),
          eventId: props.eventId,
          title: props.title,
          description: props.description,
          participantFilter: props.participantFilter,
          allowRepeatWinners: props.allowRepeatWinners,
          animationDurationSeconds: props.animationDurationSeconds,
          status: props.status,
          publicToken: props.publicToken,
          showWinnersSummary: false,
        })
        .returning({ id: raffles.id });

      const insertedPrizes = await tx
        .insert(rafflePrizes)
        .values(
          props.prizes.map((p, idx) => ({
            raffleId: insertedRaffle.id,
            title: p.title,
            description: p.description,
            orderIndex: p.orderIndex ?? idx + 1,
            status: "pendente" as const,
          })),
        )
        .returning({ id: rafflePrizes.id, orderIndex: rafflePrizes.orderIndex });

      const firstPrize = [...insertedPrizes].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      )[0];

      if (firstPrize) {
        await tx
          .update(raffles)
          .set({ currentPrizeId: firstPrize.id })
          .where(eq(raffles.id, insertedRaffle.id));
      }

      if (props.manualRegistrationIds.length > 0) {
        await tx.insert(raffleManualParticipants).values(
          props.manualRegistrationIds.map((registrationId) => ({
            raffleId: insertedRaffle.id,
            registrationId,
          })),
        );
      }

      return insertedRaffle.id;
    });

    const detail = await this.findDetailById({
      eventId: props.eventId,
      raffleId: createdRaffleId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!detail) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_CREATE_FAILED",
          message: "Falha ao carregar o sorteio recém-criado.",
        }),
      );
    }

    return Result.ok(detail);
  }

  async update(params: {
    eventId: string;
    raffleId: string;
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>> {
    const eventRow = await this.verifyEventAccess({
      eventId: params.eventId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!eventRow) {
      return Result.fail(
        new RaffleRuleError({
          code: "EVENT_NOT_FOUND",
          message: "Evento não encontrado ou você não tem permissão.",
        }),
      );
    }

    const [existing] = await this.database
      .select()
      .from(raffles)
      .where(
        and(
          eq(raffles.id, params.raffleId),
          eq(raffles.eventId, params.eventId),
        ),
      )
      .limit(1);

    if (!existing) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_NOT_FOUND",
          message: "Sorteio não encontrado.",
        }),
      );
    }

    const props = params.raffle.attributes;
    const now = new Date();

    await this.database.transaction(async (tx) => {
      const existingPrizes = await tx
        .select()
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, existing.id));

      const existingById = new Map(existingPrizes.map((p) => [p.id, p]));
      const keptIds = new Set<string>();

      for (let i = 0; i < props.prizes.length; i++) {
        const prizeInput = props.prizes[i];
        const orderIndex = i + 1;
        if (prizeInput.id && existingById.has(prizeInput.id)) {
          keptIds.add(prizeInput.id);
          await tx
            .update(rafflePrizes)
            .set({
              title: prizeInput.title,
              description: prizeInput.description,
              orderIndex,
              updatedAt: now,
            })
            .where(eq(rafflePrizes.id, prizeInput.id));
        } else {
          const [inserted] = await tx
            .insert(rafflePrizes)
            .values({
              raffleId: existing.id,
              title: prizeInput.title,
              description: prizeInput.description,
              orderIndex,
              status: "pendente",
            })
            .returning({ id: rafflePrizes.id });
          keptIds.add(inserted.id);
        }
      }

      const toDelete = existingPrizes
        .filter((p) => !keptIds.has(p.id) && p.status === "pendente")
        .map((p) => p.id);

      if (toDelete.length > 0) {
        await tx
          .delete(rafflePrizes)
          .where(inArray(rafflePrizes.id, toDelete));
      }

      await tx
        .delete(raffleManualParticipants)
        .where(eq(raffleManualParticipants.raffleId, existing.id));

      if (props.manualRegistrationIds.length > 0) {
        await tx.insert(raffleManualParticipants).values(
          props.manualRegistrationIds.map((registrationId) => ({
            raffleId: existing.id,
            registrationId,
          })),
        );
      }

      const updatedPrizes = await tx
        .select()
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, existing.id))
        .orderBy(asc(rafflePrizes.orderIndex));

      const validCurrentPrizeId =
        existing.currentPrizeId &&
        updatedPrizes.some((p) => p.id === existing.currentPrizeId)
          ? existing.currentPrizeId
          : updatedPrizes[0]?.id ?? null;

      await tx
        .update(raffles)
        .set({
          title: props.title,
          description: props.description,
          participantFilter: props.participantFilter,
          allowRepeatWinners: props.allowRepeatWinners,
          animationDurationSeconds: props.animationDurationSeconds,
          currentPrizeId: validCurrentPrizeId,
          updatedAt: now,
        })
        .where(eq(raffles.id, existing.id));
    });

    const detail = await this.findDetailById({
      eventId: params.eventId,
      raffleId: params.raffleId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!detail) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_UPDATE_FAILED",
          message: "Não foi possível carregar o sorteio atualizado.",
        }),
      );
    }

    return Result.ok(detail);
  }

  async delete(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<void, DomainError>> {
    const eventRow = await this.verifyEventAccess(params);
    if (!eventRow) {
      return Result.fail(
        new RaffleRuleError({
          code: "EVENT_NOT_FOUND",
          message: "Evento não encontrado ou você não tem permissão.",
        }),
      );
    }

    await this.database
      .delete(raffles)
      .where(
        and(
          eq(raffles.id, params.raffleId),
          eq(raffles.eventId, params.eventId),
        ),
      );

    return Result.ok(undefined);
  }

  async executeAction(
    params: ExecuteRaffleActionParams,
  ): Promise<Result<RaffleDetail, DomainError>> {
    const detail = await this.findDetailById({
      eventId: params.eventId,
      raffleId: params.raffleId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!detail) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_NOT_FOUND",
          message: "Sorteio não encontrado ou acesso negado.",
        }),
      );
    }

    const now = new Date();

    if (params.action === "start") {
      if (detail.status === "cancelado") {
        return Result.fail(
          new RaffleRuleError({
            code: "RAFFLE_CANCELLED",
            message: "Este sorteio foi cancelado. Reinicie-o se desejar sortear novamente.",
          }),
        );
      }
      const firstPending =
        detail.prizes.find((p) => p.status === "pendente") ?? detail.prizes[0];

      await this.database
        .update(raffles)
        .set({
          status: "em_andamento",
          currentPrizeId: firstPending?.id ?? null,
          showWinnersSummary: false,
          startedAt: detail.startedAt ?? now,
          updatedAt: now,
        })
        .where(eq(raffles.id, detail.id));
    } else if (params.action === "select_prize") {
      const target = detail.prizes.find((p) => p.id === params.prizeId);
      if (!target) {
        return Result.fail(
          new RaffleRuleError({
            code: "PRIZE_NOT_FOUND",
            message: "Prêmio não encontrado neste sorteio.",
          }),
        );
      }

      await this.database
        .update(raffles)
        .set({
          currentPrizeId: target.id,
          showWinnersSummary: false,
          status: detail.status === "rascunho" ? "em_andamento" : detail.status,
          startedAt: detail.startedAt ?? now,
          updatedAt: now,
        })
        .where(eq(raffles.id, detail.id));
    } else if (params.action === "draw_prize") {
      if (detail.status === "cancelado") {
        return Result.fail(
          new RaffleRuleError({
            code: "RAFFLE_CANCELLED",
            message: "Não é possível sortear um prêmio em um sorteio cancelado.",
          }),
        );
      }

      const targetPrize =
        (params.prizeId
          ? detail.prizes.find((p) => p.id === params.prizeId)
          : undefined) ??
        detail.prizes.find((p) => p.id === detail.currentPrizeId && p.status === "pendente") ??
        detail.prizes.find((p) => p.status === "pendente");

      if (!targetPrize) {
        return Result.fail(
          new RaffleRuleError({
            code: "NO_PENDING_PRIZE",
            message: "Todos os prêmios já foram sorteados.",
          }),
        );
      }

      if (detail.eligibleCandidates.length === 0) {
        return Result.fail(
          new RaffleRuleError({
            code: "NO_ELIGIBLE_CANDIDATES",
            message:
              "Não há participantes elegíveis disponíveis para este sorteio com os filtros selecionados.",
          }),
        );
      }

      const randomIndex = randomInt(0, detail.eligibleCandidates.length);
      const winner = detail.eligibleCandidates[randomIndex];

      await this.database.transaction(async (tx) => {
        await tx
          .update(rafflePrizes)
          .set({
            status: "sorteado",
            winnerRegistrationId: winner.registrationId,
            winnerParticipantId: winner.participantId,
            winnerName: winner.participantName,
            winnerTicketCode: winner.registrationCode,
            drawnAt: now,
            disqualificationReason: null,
            updatedAt: now,
          })
          .where(eq(rafflePrizes.id, targetPrize.id));

        const remainingPending = detail.prizes.filter(
          (p) => p.id !== targetPrize.id && p.status === "pendente",
        ).length;

        await tx
          .update(raffles)
          .set({
            status: remainingPending === 0 ? "concluido" : "em_andamento",
            currentPrizeId: targetPrize.id,
            showWinnersSummary: false,
            startedAt: detail.startedAt ?? now,
            completedAt: remainingPending === 0 ? now : detail.completedAt,
            updatedAt: now,
          })
          .where(eq(raffles.id, detail.id));

        await tx.insert(raffleDrawHistory).values({
          raffleId: detail.id,
          prizeId: targetPrize.id,
          winnerRegistrationId: winner.registrationId,
          winnerName: winner.participantName,
          winnerTicketCode: winner.registrationCode,
          action: "sorteado",
          drawnByUserId: params.actorId,
          drawnByUserName: params.actorName,
        });
      });
    } else if (params.action === "redraw_prize") {
      const targetPrize =
        (params.prizeId
          ? detail.prizes.find((p) => p.id === params.prizeId)
          : undefined) ??
        detail.prizes.find((p) => p.id === detail.currentPrizeId);

      if (!targetPrize) {
        return Result.fail(
          new RaffleRuleError({
            code: "PRIZE_NOT_FOUND",
            message: "Selecione o prêmio que deseja sortear novamente.",
          }),
        );
      }

      // Compute candidates excluding current winner of this prize as well
      const candidatesAfterDisqualification = detail.eligibleCandidates.filter(
        (c) => c.registrationId !== targetPrize.winnerRegistrationId,
      );

      if (candidatesAfterDisqualification.length === 0) {
        return Result.fail(
          new RaffleRuleError({
            code: "NO_ELIGIBLE_CANDIDATES",
            message:
              "Não há outros participantes elegíveis restantes para refazer o sorteio.",
          }),
        );
      }

      const randomIndex = randomInt(0, candidatesAfterDisqualification.length);
      const newWinner = candidatesAfterDisqualification[randomIndex];
      const reasonText =
        params.reason?.trim() || "Ganhador ausente ou sorteio refeito pelo operador";

      await this.database.transaction(async (tx) => {
        if (targetPrize.winnerName) {
          await tx.insert(raffleDrawHistory).values({
            raffleId: detail.id,
            prizeId: targetPrize.id,
            winnerRegistrationId: targetPrize.winnerRegistrationId,
            winnerName: targetPrize.winnerName,
            winnerTicketCode: targetPrize.winnerTicketCode,
            action: "anulado",
            reason: reasonText,
            drawnByUserId: params.actorId,
            drawnByUserName: params.actorName,
          });
        }

        await tx
          .update(rafflePrizes)
          .set({
            status: "sorteado",
            winnerRegistrationId: newWinner.registrationId,
            winnerParticipantId: newWinner.participantId,
            winnerName: newWinner.participantName,
            winnerTicketCode: newWinner.registrationCode,
            drawnAt: now,
            disqualificationReason: reasonText,
            updatedAt: now,
          })
          .where(eq(rafflePrizes.id, targetPrize.id));

        await tx
          .update(raffles)
          .set({
            currentPrizeId: targetPrize.id,
            showWinnersSummary: false,
            updatedAt: now,
          })
          .where(eq(raffles.id, detail.id));

        await tx.insert(raffleDrawHistory).values({
          raffleId: detail.id,
          prizeId: targetPrize.id,
          winnerRegistrationId: newWinner.registrationId,
          winnerName: newWinner.participantName,
          winnerTicketCode: newWinner.registrationCode,
          action: "sorteado",
          drawnByUserId: params.actorId,
          drawnByUserName: params.actorName,
        });
      });
    } else if (params.action === "next_prize") {
      const nextPending = detail.prizes.find((p) => p.status === "pendente");
      if (nextPending) {
        await this.database
          .update(raffles)
          .set({
            currentPrizeId: nextPending.id,
            showWinnersSummary: false,
            status: "em_andamento",
            updatedAt: now,
          })
          .where(eq(raffles.id, detail.id));
      } else {
        await this.database
          .update(raffles)
          .set({
            status: "concluido",
            showWinnersSummary: true,
            completedAt: detail.completedAt ?? now,
            updatedAt: now,
          })
          .where(eq(raffles.id, detail.id));
      }
    } else if (params.action === "toggle_summary") {
      const nextShow = !detail.showWinnersSummary;
      const allDrawn = detail.prizes.every((p) => p.status === "sorteado");
      await this.database
        .update(raffles)
        .set({
          showWinnersSummary: nextShow,
          status: allDrawn ? "concluido" : detail.status,
          completedAt: allDrawn ? detail.completedAt ?? now : detail.completedAt,
          updatedAt: now,
        })
        .where(eq(raffles.id, detail.id));
    } else if (params.action === "reset") {
      const firstPrize = detail.prizes[0];
      await this.database.transaction(async (tx) => {
        await tx
          .update(rafflePrizes)
          .set({
            status: "pendente",
            winnerRegistrationId: null,
            winnerParticipantId: null,
            winnerName: null,
            winnerTicketCode: null,
            drawnAt: null,
            disqualificationReason: null,
            updatedAt: now,
          })
          .where(eq(rafflePrizes.raffleId, detail.id));

        await tx
          .delete(raffleDrawHistory)
          .where(eq(raffleDrawHistory.raffleId, detail.id));

        await tx
          .update(raffles)
          .set({
            status: "rascunho",
            currentPrizeId: firstPrize?.id ?? null,
            showWinnersSummary: false,
            startedAt: null,
            completedAt: null,
            updatedAt: now,
          })
          .where(eq(raffles.id, detail.id));
      });
    } else if (params.action === "cancel") {
      await this.database
        .update(raffles)
        .set({
          status: "cancelado",
          showWinnersSummary: false,
          updatedAt: now,
        })
        .where(eq(raffles.id, detail.id));
    }

    const updatedDetail = await this.findDetailById({
      eventId: params.eventId,
      raffleId: params.raffleId,
      actorId: params.actorId,
      canManageAll: params.canManageAll,
    });

    if (!updatedDetail) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_RELOAD_FAILED",
          message: "Falha ao recarregar os dados do sorteio.",
        }),
      );
    }

    return Result.ok(updatedDetail);
  }
}
