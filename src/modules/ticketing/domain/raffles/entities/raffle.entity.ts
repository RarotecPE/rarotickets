import { Entity, type EntityConstructorParams } from "@/@core/domain/entity.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type RaffleFilterType = "todos" | "pagantes" | "presentes" | "manual";
export type RaffleStatus = "rascunho" | "em_andamento" | "concluido" | "cancelado";
export type RafflePrizeStatus = "pendente" | "sorteando" | "sorteado" | "anulado";

export type RafflePrizeInput = {
  id?: string;
  title: string;
  description?: string | null;
  orderIndex?: number;
};

export type RaffleCandidate = {
  registrationId: string;
  registrationCode: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  registrationStatus: string;
  finalCents: number;
  lotName: string | null;
  checkedIn: boolean;
  checkInAt: Date | null;
};

export type RaffleProps = {
  eventId: string;
  title: string;
  description: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners: boolean;
  animationDurationSeconds: number;
  status: RaffleStatus;
  publicToken: string;
  prizes: {
    id?: string;
    title: string;
    description: string | null;
    orderIndex: number;
  }[];
  manualRegistrationIds: string[];
};

export class RaffleRuleError extends DomainError {
  constructor(params: { code: string; message: string }) {
    super(params);
  }
}

export type CreateRaffleParams = {
  id?: Identifier | string;
  eventId: string;
  title: string;
  description?: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners?: boolean;
  animationDurationSeconds?: number;
  status?: RaffleStatus;
  publicToken: string;
  prizes: RafflePrizeInput[];
  manualRegistrationIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const VALID_FILTERS: RaffleFilterType[] = ["todos", "pagantes", "presentes", "manual"];

export class Raffle extends Entity<RaffleProps> {
  private constructor(params: EntityConstructorParams<RaffleProps>) {
    super(params);
  }

  static create(params: CreateRaffleParams): Result<Raffle, RaffleRuleError> {
    if (!params.eventId?.trim()) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_EVENT_REQUIRED",
          message: "O evento vinculado ao sorteio é obrigatório.",
        }),
      );
    }

    const title = params.title?.trim() ?? "";
    if (title.length < 3 || title.length > 150) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_INVALID_TITLE",
          message: "O nome do sorteio deve ter entre 3 e 150 caracteres.",
        }),
      );
    }

    if (!VALID_FILTERS.includes(params.participantFilter)) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_INVALID_FILTER",
          message: "Parâmetro de seleção de participantes inválido.",
        }),
      );
    }

    const animationDuration = params.animationDurationSeconds ?? 7;
    if (
      !Number.isInteger(animationDuration) ||
      animationDuration < 2 ||
      animationDuration > 30
    ) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_INVALID_DURATION",
          message: "O tempo de giro da roleta deve ser entre 2 e 30 segundos.",
        }),
      );
    }

    if (!Array.isArray(params.prizes) || params.prizes.length === 0) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_PRIZES_REQUIRED",
          message: "Cadastre pelo menos 1 prêmio para o sorteio.",
        }),
      );
    }

    const normalizedPrizes: RaffleProps["prizes"] = [];
    for (let i = 0; i < params.prizes.length; i++) {
      const p = params.prizes[i];
      const prizeTitle = p.title?.trim() ?? "";
      if (!prizeTitle || prizeTitle.length > 150) {
        return Result.fail(
          new RaffleRuleError({
            code: "RAFFLE_INVALID_PRIZE_TITLE",
            message: `O título do ${i + 1}º prêmio é obrigatório e deve ter até 150 caracteres.`,
          }),
        );
      }
      normalizedPrizes.push({
        id: p.id,
        title: prizeTitle,
        description: p.description?.trim() || null,
        orderIndex: p.orderIndex ?? i + 1,
      });
    }

    const manualIds = Array.from(
      new Set((params.manualRegistrationIds ?? []).map((id) => id.trim()).filter(Boolean)),
    );

    if (params.participantFilter === "manual" && manualIds.length === 0) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_MANUAL_PARTICIPANTS_REQUIRED",
          message: "Selecione ao menos 1 participante quando o filtro for manual.",
        }),
      );
    }

    const raffleId =
      params.id instanceof Identifier
        ? params.id
        : Identifier.fromExisting(params.id ?? globalThis.crypto.randomUUID());
    const now = new Date();

    return Result.ok(
      new Raffle({
        id: raffleId,
        props: {
          eventId: params.eventId.trim(),
          title,
          description: params.description?.trim() || null,
          participantFilter: params.participantFilter,
          allowRepeatWinners: Boolean(params.allowRepeatWinners),
          animationDurationSeconds: animationDuration,
          status: params.status ?? "rascunho",
          publicToken: params.publicToken.trim(),
          prizes: normalizedPrizes,
          manualRegistrationIds: manualIds,
        },
        createdAt: params.createdAt ?? now,
        updatedAt: params.updatedAt ?? now,
      }),
    );
  }

  get attributes(): RaffleProps {
    return this.props;
  }

  static filterEligibleCandidates(params: {
    candidates: RaffleCandidate[];
    filter: RaffleFilterType;
    allowRepeatWinners: boolean;
    manualRegistrationIds: string[];
    alreadyWonParticipantIds: string[];
    alreadyWonRegistrationIds: string[];
  }): RaffleCandidate[] {
    const manualSet = new Set(params.manualRegistrationIds);
    const wonParticipantSet = new Set(params.alreadyWonParticipantIds);
    const wonRegistrationSet = new Set(params.alreadyWonRegistrationIds);

    return params.candidates.filter((c) => {
      if (c.registrationStatus !== "confirmada") return false;

      if (params.filter === "pagantes" && c.finalCents <= 0) {
        return false;
      }

      if (params.filter === "presentes" && !c.checkedIn) {
        return false;
      }

      if (params.filter === "manual" && !manualSet.has(c.registrationId)) {
        return false;
      }

      if (!params.allowRepeatWinners) {
        if (
          wonParticipantSet.has(c.participantId) ||
          wonRegistrationSet.has(c.registrationId)
        ) {
          return false;
        }
      }

      return true;
    });
  }
}
