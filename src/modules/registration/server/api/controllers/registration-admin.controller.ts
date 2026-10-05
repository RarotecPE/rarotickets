import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { CancelRegistrationInputDto } from '../../../application/use-cases/cancel-registration/cancel-registration.input.dto';
import type { CancelRegistrationOutputDto } from '../../../application/use-cases/cancel-registration/cancel-registration.output.dto';
import type { ExpireReservationsInputDto } from '../../../application/use-cases/expire-reservations/expire-reservations.input.dto';
import type { ExpireReservationsOutputDto } from '../../../application/use-cases/expire-reservations/expire-reservations.output.dto';
import type { GetRegistrationInputDto } from '../../../application/use-cases/get-registration/get-registration.input.dto';
import type { GetRegistrationOutputDto } from '../../../application/use-cases/get-registration/get-registration.output.dto';
import type { ListRegistrationsInputDto } from '../../../application/use-cases/list-registrations/list-registrations.input.dto';
import type { ListRegistrationsOutputDto } from '../../../application/use-cases/list-registrations/list-registrations.output.dto';
import type { PerformCheckInInputDto } from '../../../application/use-cases/perform-check-in/perform-check-in.input.dto';
import type { PerformCheckInOutputDto } from '../../../application/use-cases/perform-check-in/perform-check-in.output.dto';
import type { PromoteFromWaitlistInputDto } from '../../../application/use-cases/promote-from-waitlist/promote-from-waitlist.input.dto';
import type { PromoteFromWaitlistOutputDto } from '../../../application/use-cases/promote-from-waitlist/promote-from-waitlist.output.dto';
import type { RegistrationAdminActionRequest } from '../dtos/registration.request.types';

export type RegistrationAdminControllerDependencies = {
  listRegistrationsUseCase: IUseCase<ListRegistrationsInputDto, ListRegistrationsOutputDto>;
  getRegistrationUseCase: IUseCase<GetRegistrationInputDto, GetRegistrationOutputDto>;
  cancelRegistrationUseCase: IUseCase<CancelRegistrationInputDto, CancelRegistrationOutputDto>;
  promoteFromWaitlistUseCase: IUseCase<PromoteFromWaitlistInputDto, PromoteFromWaitlistOutputDto>;
  performCheckInUseCase: IUseCase<PerformCheckInInputDto, PerformCheckInOutputDto>;
  expireReservationsUseCase: IUseCase<ExpireReservationsInputDto, ExpireReservationsOutputDto>;
  listCheckIns: (eventId: string) => Promise<{
    checkIns: Array<{
      registrationId: string;
      eventId: string;
      checkedInAt: Date;
      operatorName: string | null;
      method: string;
      isOverride: boolean;
      overrideReason: string | null;
    }>;
  }>;
};

/** Operações administrativas de inscrições, lista de espera e check-in (§9, §26, §29). */
export class RegistrationAdminController extends Controller<
  HttpRequestContext<RegistrationAdminActionRequest>,
  HttpResponse
> {
  private readonly dependencies: RegistrationAdminControllerDependencies;

  constructor(dependencies: RegistrationAdminControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<RegistrationAdminActionRequest>): Promise<HttpResponse> {
    const actor = request.actor;
    if (!actor) return HttpResponse.unauthorized();
    const ip = request.ip;

    switch (request.body.action) {
      case 'list': {
        const query = request.body.query;
        const result = await this.dependencies.listRegistrationsUseCase.execute({
          eventId: query.eventId ?? null,
          participantId: query.participantId ?? null,
          status: query.status ?? null,
          search: query.search ?? null,
          includingCancelled: query.includingCancelled === 'true',
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 20,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value.registrations, { ...result.value.meta });
      }
      case 'detail': {
        const result = await this.dependencies.getRegistrationUseCase.execute({
          registrationId: request.body.registrationId,
        });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'REGISTRATION_NOT_FOUND');
        return HttpResponse.ok(result.value);
      }
      case 'cancel': {
        const result = await this.dependencies.cancelRegistrationUseCase.execute({
          registrationId: request.body.registrationId,
          reason: request.body.body.reason ?? 'Cancelamento administrativo',
          actorUserId: actor.userId,
          actorName: actor.name,
          isAdministrative: true,
          ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CANCEL_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'promote': {
        const result = await this.dependencies.promoteFromWaitlistUseCase.execute({
          registrationId: request.body.registrationId,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'PROMOTE_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'checkIn': {
        const result = await this.dependencies.performCheckInUseCase.execute({
          credentialToken: request.body.body.credentialToken ?? null,
          code: request.body.body.code ?? null,
          registrationId: request.body.body.registrationId ?? null,
          override: request.body.body.override ?? false,
          overrideReason: request.body.body.overrideReason ?? null,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CHECK_IN_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'checkIns': {
        const result = await this.dependencies.listCheckIns(request.body.eventId);
        return HttpResponse.ok(result.checkIns);
      }
      case 'expireReservations': {
        const result = await this.dependencies.expireReservationsUseCase.execute({
          limit: request.body.body.limit ?? 100,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }
}
