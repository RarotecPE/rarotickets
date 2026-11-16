import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { DomainError } from "@/@core/domain/errors/domain-error.base";
import {
  Raffle,
  RaffleRuleError,
  type RaffleFilterType,
  type RafflePrizeInput,
} from "@/modules/ticketing/domain/raffles/entities/raffle.entity";
import type {
  PublicRaffleView,
  RaffleActionType,
  RaffleDetail,
  RaffleRepository,
  RaffleSummary,
} from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type ListEventRafflesInput = {
  eventId: string;
  actorId: string;
  canManageAll: boolean;
};

export class ListEventRafflesUseCase extends UseCase<
  ListEventRafflesInput,
  RaffleSummary[]
> {
  constructor(private readonly deps: { raffleRepository: RaffleRepository }) {
    super();
  }

  async execute(input: ListEventRafflesInput): Promise<Result<RaffleSummary[]>> {
    const items = await this.deps.raffleRepository.listByEvent(input);
    return Result.ok(items);
  }
}

export type GetEventRaffleInput = {
  eventId: string;
  raffleId: string;
  actorId: string;
  canManageAll: boolean;
};

export class GetEventRaffleUseCase extends UseCase<
  GetEventRaffleInput,
  RaffleDetail
> {
  constructor(private readonly deps: { raffleRepository: RaffleRepository }) {
    super();
  }

  async execute(input: GetEventRaffleInput): Promise<Result<RaffleDetail>> {
    const detail = await this.deps.raffleRepository.findDetailById(input);
    if (!detail) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_NOT_FOUND",
          message: "Sorteio não encontrado.",
        }),
      );
    }
    return Result.ok(detail);
  }
}

export class GetPublicRaffleUseCase extends UseCase<
  { token: string },
  PublicRaffleView
> {
  constructor(private readonly deps: { raffleRepository: RaffleRepository }) {
    super();
  }

  async execute(input: { token: string }): Promise<Result<PublicRaffleView>> {
    const view = await this.deps.raffleRepository.findPublicByToken(input.token);
    if (!view) {
      return Result.fail(
        new RaffleRuleError({
          code: "RAFFLE_NOT_FOUND",
          message: "Painel de sorteio não encontrado ou link inválido.",
        }),
      );
    }
    return Result.ok(view);
  }
}

export type CreateEventRaffleInput = {
  eventId: string;
  title: string;
  description?: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners?: boolean;
  animationDurationSeconds?: number;
  prizes: RafflePrizeInput[];
  manualRegistrationIds?: string[];
  actorId: string;
  actorName: string;
  canManageAll: boolean;
  ip: string | null;
};

export class CreateEventRaffleUseCase extends UseCase<
  CreateEventRaffleInput,
  RaffleDetail
> {
  constructor(
    private readonly deps: {
      raffleRepository: RaffleRepository;
      auditRepository: IAuditRepository;
    },
  ) {
    super();
  }

  async execute(
    input: CreateEventRaffleInput,
  ): Promise<Result<RaffleDetail, DomainError>> {
    const publicToken = `RAF-${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;

    const raffleOrError = Raffle.create({
      eventId: input.eventId,
      title: input.title,
      description: input.description,
      participantFilter: input.participantFilter,
      allowRepeatWinners: input.allowRepeatWinners,
      animationDurationSeconds: input.animationDurationSeconds,
      publicToken,
      prizes: input.prizes,
      manualRegistrationIds: input.manualRegistrationIds,
    });

    if (raffleOrError.isFailure) {
      return Result.fail(raffleOrError.error);
    }

    const result = await this.deps.raffleRepository.create({
      raffle: raffleOrError.value,
      actorId: input.actorId,
      canManageAll: input.canManageAll,
    });

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    await this.deps.auditRepository.write({
      userId: input.actorId,
      userName: input.actorName,
      action: "raffle.created",
      entity: "raffle",
      recordId: result.value.id,
      beforeData: null,
      afterData: {
        eventId: input.eventId,
        title: result.value.title,
        participantFilter: result.value.participantFilter,
        prizesCount: result.value.prizes.length,
      },
      ip: input.ip,
    });

    return Result.ok(result.value);
  }
}

export type UpdateEventRaffleInput = {
  eventId: string;
  raffleId: string;
  title: string;
  description?: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners?: boolean;
  animationDurationSeconds?: number;
  prizes: RafflePrizeInput[];
  manualRegistrationIds?: string[];
  actorId: string;
  actorName: string;
  canManageAll: boolean;
  ip: string | null;
};

export class UpdateEventRaffleUseCase extends UseCase<
  UpdateEventRaffleInput,
  RaffleDetail
> {
  constructor(
    private readonly deps: {
      raffleRepository: RaffleRepository;
      auditRepository: IAuditRepository;
    },
  ) {
    super();
  }

  async execute(
    input: UpdateEventRaffleInput,
  ): Promise<Result<RaffleDetail, DomainError>> {
    const raffleOrError = Raffle.create({
      id: input.raffleId,
      eventId: input.eventId,
      title: input.title,
      description: input.description,
      participantFilter: input.participantFilter,
      allowRepeatWinners: input.allowRepeatWinners,
      animationDurationSeconds: input.animationDurationSeconds,
      publicToken: "KEEP-EXISTING",
      prizes: input.prizes,
      manualRegistrationIds: input.manualRegistrationIds,
    });

    if (raffleOrError.isFailure) {
      return Result.fail(raffleOrError.error);
    }

    const result = await this.deps.raffleRepository.update({
      eventId: input.eventId,
      raffleId: input.raffleId,
      raffle: raffleOrError.value,
      actorId: input.actorId,
      canManageAll: input.canManageAll,
    });

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    await this.deps.auditRepository.write({
      userId: input.actorId,
      userName: input.actorName,
      action: "raffle.updated",
      entity: "raffle",
      recordId: result.value.id,
      beforeData: null,
      afterData: {
        title: result.value.title,
        participantFilter: result.value.participantFilter,
        prizesCount: result.value.prizes.length,
      },
      ip: input.ip,
    });

    return Result.ok(result.value);
  }
}

export type DeleteEventRaffleInput = {
  eventId: string;
  raffleId: string;
  actorId: string;
  actorName: string;
  canManageAll: boolean;
  ip: string | null;
};

export class DeleteEventRaffleUseCase extends UseCase<
  DeleteEventRaffleInput,
  { deleted: boolean }
> {
  constructor(
    private readonly deps: {
      raffleRepository: RaffleRepository;
      auditRepository: IAuditRepository;
    },
  ) {
    super();
  }

  async execute(
    input: DeleteEventRaffleInput,
  ): Promise<Result<{ deleted: boolean }, DomainError>> {
    const result = await this.deps.raffleRepository.delete(input);
    if (result.isFailure) {
      return Result.fail(result.error);
    }

    await this.deps.auditRepository.write({
      userId: input.actorId,
      userName: input.actorName,
      action: "raffle.deleted",
      entity: "raffle",
      recordId: input.raffleId,
      beforeData: { eventId: input.eventId },
      afterData: null,
      ip: input.ip,
    });

    return Result.ok({ deleted: true });
  }
}

export type ControlEventRaffleInput = {
  eventId: string;
  raffleId: string;
  action: RaffleActionType;
  prizeId?: string;
  reason?: string | null;
  actorId: string;
  actorName: string;
  canManageAll: boolean;
  ip: string | null;
};

export class ControlEventRaffleUseCase extends UseCase<
  ControlEventRaffleInput,
  RaffleDetail
> {
  constructor(
    private readonly deps: {
      raffleRepository: RaffleRepository;
      auditRepository: IAuditRepository;
    },
  ) {
    super();
  }

  async execute(
    input: ControlEventRaffleInput,
  ): Promise<Result<RaffleDetail, DomainError>> {
    const result = await this.deps.raffleRepository.executeAction(input);
    if (result.isFailure) {
      return Result.fail(result.error);
    }

    await this.deps.auditRepository.write({
      userId: input.actorId,
      userName: input.actorName,
      action: `raffle.${input.action}`,
      entity: "raffle",
      recordId: input.raffleId,
      beforeData: null,
      afterData: {
        action: input.action,
        prizeId: input.prizeId ?? null,
        reason: input.reason ?? null,
        status: result.value.status,
      },
      ip: input.ip,
    });

    return Result.ok(result.value);
  }
}
