import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import {
  ControlEventRaffleUseCase,
  CreateEventRaffleUseCase,
  DeleteEventRaffleUseCase,
  GetEventRaffleUseCase,
  GetPublicRaffleUseCase,
  ListEventRafflesUseCase,
  UpdateEventRaffleUseCase,
} from "@/modules/ticketing/application/use-cases/raffles/raffles.use-case";
import type {
  RaffleFilterType,
  RafflePrizeInput,
} from "@/modules/ticketing/domain/raffles/entities/raffle.entity";
import type { RaffleActionType } from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import {
  getClientIp,
  readBoolean,
  readInteger,
  readObject,
  readOptionalText,
  readText,
} from "@/server/api/request-data.util";
import {
  internalErrorResponse,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export class ListEventRafflesController extends Controller<
  { request: NextRequest; eventId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: ListEventRafflesUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:read",
    });
    if (!guard.ok) return guard.response;

    try {
      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        actorId: guard.session.user.id,
        canManageAll: guard.scope.canViewAllEvents,
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class GetEventRaffleController extends Controller<
  { request: NextRequest; eventId: string; raffleId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: GetEventRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
    raffleId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:read",
    });
    if (!guard.ok) return guard.response;

    try {
      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        raffleId: input.raffleId,
        actorId: guard.session.user.id,
        canManageAll: guard.scope.canViewAllEvents,
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 404 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class CreateEventRaffleController extends Controller<
  { request: NextRequest; eventId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: CreateEventRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const rawPrizes = Array.isArray(body.prizes) ? body.prizes : [];
      const prizes: RafflePrizeInput[] = rawPrizes.map((item, idx) => {
        const obj = readObject(item);
        return {
          title: readText({ value: obj.title }),
          description: readOptionalText({ value: obj.description }),
          orderIndex: readInteger({ value: obj.orderIndex, fallback: idx + 1 }),
        };
      });

      const rawManualIds = Array.isArray(body.manualRegistrationIds)
        ? body.manualRegistrationIds
        : [];
      const manualRegistrationIds = rawManualIds
        .map((id) => readText({ value: id }))
        .filter(Boolean);

      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        title: readText({ value: body.title }),
        description: readOptionalText({ value: body.description }),
        participantFilter: readText({
          value: body.participantFilter,
          fallback: "todos",
        }) as RaffleFilterType,
        allowRepeatWinners: readBoolean({ value: body.allowRepeatWinners }),
        animationDurationSeconds: readInteger({
          value: body.animationDurationSeconds,
          fallback: 7,
        }),
        prizes,
        manualRegistrationIds,
        actorId: guard.session.user.id,
        actorName: guard.session.user.nome,
        canManageAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class UpdateEventRaffleController extends Controller<
  { request: NextRequest; eventId: string; raffleId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: UpdateEventRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
    raffleId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const rawPrizes = Array.isArray(body.prizes) ? body.prizes : [];
      const prizes: RafflePrizeInput[] = rawPrizes.map((item, idx) => {
        const obj = readObject(item);
        return {
          id: readOptionalText({ value: obj.id }) ?? undefined,
          title: readText({ value: obj.title }),
          description: readOptionalText({ value: obj.description }),
          orderIndex: readInteger({ value: obj.orderIndex, fallback: idx + 1 }),
        };
      });

      const rawManualIds = Array.isArray(body.manualRegistrationIds)
        ? body.manualRegistrationIds
        : [];
      const manualRegistrationIds = rawManualIds
        .map((id) => readText({ value: id }))
        .filter(Boolean);

      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        raffleId: input.raffleId,
        title: readText({ value: body.title }),
        description: readOptionalText({ value: body.description }),
        participantFilter: readText({
          value: body.participantFilter,
          fallback: "todos",
        }) as RaffleFilterType,
        allowRepeatWinners: readBoolean({ value: body.allowRepeatWinners }),
        animationDurationSeconds: readInteger({
          value: body.animationDurationSeconds,
          fallback: 7,
        }),
        prizes,
        manualRegistrationIds,
        actorId: guard.session.user.id,
        actorName: guard.session.user.nome,
        canManageAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class DeleteEventRaffleController extends Controller<
  { request: NextRequest; eventId: string; raffleId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: DeleteEventRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
    raffleId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        raffleId: input.raffleId,
        actorId: guard.session.user.id,
        actorName: guard.session.user.nome,
        canManageAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class ControlEventRaffleController extends Controller<
  { request: NextRequest; eventId: string; raffleId: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: ControlEventRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    eventId: string;
    raffleId: string;
  }): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "events:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const action = readText({ value: body.action }) as RaffleActionType;
      const prizeId = readOptionalText({ value: body.prizeId }) ?? undefined;
      const reason = readOptionalText({ value: body.reason }) ?? undefined;

      const result = await this.deps.useCase.execute({
        eventId: input.eventId,
        raffleId: input.raffleId,
        action,
        prizeId,
        reason,
        actorId: guard.session.user.id,
        actorName: guard.session.user.nome,
        canManageAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export class GetPublicRaffleController extends Controller<
  { request: NextRequest; token: string },
  NextResponse
> {
  constructor(private readonly deps: { useCase: GetPublicRaffleUseCase }) {
    super();
  }

  async handle(input: {
    request: NextRequest;
    token: string;
  }): Promise<NextResponse> {
    try {
      const result = await this.deps.useCase.execute({ token: input.token });
      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 404 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
