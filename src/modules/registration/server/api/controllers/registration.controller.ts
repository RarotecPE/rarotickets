import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { CancelRegistrationInputDto } from '../../../application/use-cases/cancel-registration/cancel-registration.input.dto';
import type { CancelRegistrationOutputDto } from '../../../application/use-cases/cancel-registration/cancel-registration.output.dto';
import type { GetRegistrationCredentialInputDto } from '../../../application/use-cases/get-registration-credential/get-registration-credential.input.dto';
import type { GetRegistrationCredentialOutputDto } from '../../../application/use-cases/get-registration-credential/get-registration-credential.output.dto';
import type { GetRegistrationInputDto } from '../../../application/use-cases/get-registration/get-registration.input.dto';
import type { GetRegistrationOutputDto } from '../../../application/use-cases/get-registration/get-registration.output.dto';
import type { ListRegistrationsInputDto } from '../../../application/use-cases/list-registrations/list-registrations.input.dto';
import type { ListRegistrationsOutputDto } from '../../../application/use-cases/list-registrations/list-registrations.output.dto';
import type { RegisterForEventInputDto } from '../../../application/use-cases/register-for-event/register-for-event.input.dto';
import type { RegisterForEventOutputDto } from '../../../application/use-cases/register-for-event/register-for-event.output.dto';
import type { RegistrationActionRequest } from '../dtos/registration.request.types';

export type RegistrationControllerDependencies = {
  registerForEventUseCase: IUseCase<RegisterForEventInputDto, RegisterForEventOutputDto>;
  getRegistrationUseCase: IUseCase<GetRegistrationInputDto, GetRegistrationOutputDto>;
  listRegistrationsUseCase: IUseCase<ListRegistrationsInputDto, ListRegistrationsOutputDto>;
  cancelRegistrationUseCase: IUseCase<CancelRegistrationInputDto, CancelRegistrationOutputDto>;
  getRegistrationCredentialUseCase: IUseCase<
    GetRegistrationCredentialInputDto,
    GetRegistrationCredentialOutputDto
  >;
};

/** Fluxos do participante: inscrição, consulta por código, cancelamento e credencial (§9 a §12). */
export class RegistrationController extends Controller<
  HttpRequestContext<RegistrationActionRequest>,
  HttpResponse
> {
  private readonly dependencies: RegistrationControllerDependencies;

  constructor(dependencies: RegistrationControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<RegistrationActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'register':
        return this.register(request);
      case 'detail':
        return this.detail(request.body.code);
      case 'credential':
        return this.credential(request.body.code);
      case 'mine':
        return this.mine(request);
      case 'mineByParticipant':
        return this.mineByParticipant(request.body.participantId);
      case 'cancelMine':
        return this.cancelMine(request, request.body.code, request.body.body.reason ?? 'Cancelamento solicitado pelo participante');
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async register(request: HttpRequestContext<RegistrationActionRequest>): Promise<HttpResponse> {
    if (request.body.action !== 'register') return HttpResponse.badRequest('Ação inválida');
    const body = request.body.body;

    const result = await this.dependencies.registerForEventUseCase.execute({
      eventId: body.eventId ?? null,
      eventSlug: body.eventSlug ?? null,
      participant: {
        name: body.participant?.name ?? '',
        email: body.participant?.email ?? '',
        cpf: body.participant?.cpf ?? null,
        cnpj: body.participant?.cnpj ?? null,
        phone: body.participant?.phone ?? null,
        birthDate: body.participant?.birthDate ?? null,
        company: body.participant?.company ?? null,
        jobTitle: body.participant?.jobTitle ?? null,
        city: body.participant?.city ?? null,
        state: body.participant?.state ?? null,
      },
      answers: body.answers ?? [],
      consents: {
        termsVersion: body.consents?.termsVersion ?? '',
        privacyVersion: body.consents?.privacyVersion ?? '',
        marketingAccepted: body.consents?.marketingAccepted ?? false,
      },
      couponCode: body.couponCode ?? null,
      isCourtesy: body.isCourtesy ?? false,
      courtesyReason: body.courtesyReason ?? null,
      actorUserId: request.actor?.userId ?? null,
      actorName: request.actor?.name ?? request.participant?.name ?? null,
      ip: request.ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'REGISTRATION_FAILED');
    return HttpResponse.created(result.value);
  }

  private async detail(code: string): Promise<HttpResponse> {
    return this.executeGet({ code });
  }

  private async credential(code: string): Promise<HttpResponse> {
    const result = await this.dependencies.getRegistrationCredentialUseCase.execute({ code });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CREDENTIAL_UNAVAILABLE');
    return HttpResponse.ok(result.value);
  }

  private async mine(request: HttpRequestContext<RegistrationActionRequest>): Promise<HttpResponse> {
    const participantId = request.participant?.participantId;
    if (!participantId) return HttpResponse.unauthorized('Sessão de participante necessária');
    return this.mineByParticipant(participantId);
  }

  private async mineByParticipant(participantId: string): Promise<HttpResponse> {
    const result = await this.dependencies.listRegistrationsUseCase.execute({
      participantId,
      includingCancelled: true,
      page: 1,
      perPage: 100,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.registrations, { ...result.value.meta });
  }

  private async cancelMine(
    request: HttpRequestContext<RegistrationActionRequest>,
    code: string,
    reason: string,
  ): Promise<HttpResponse> {
    const registration = await this.executeGet({ code });
    if (registration.status !== 200) return registration;

    const result = await this.dependencies.cancelRegistrationUseCase.execute({
      code,
      reason,
      actorUserId: request.actor?.userId ?? null,
      actorName: request.actor?.name ?? request.participant?.name ?? 'Participante',
      isAdministrative: false,
      ip: request.ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CANCEL_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async executeGet(input: GetRegistrationInputDto): Promise<HttpResponse> {
    const result = await this.dependencies.getRegistrationUseCase.execute(input);
    if (result.isFailure) return HttpResponse.notFound(result.error.message, 'REGISTRATION_NOT_FOUND');
    return HttpResponse.ok(result.value);
  }
}
