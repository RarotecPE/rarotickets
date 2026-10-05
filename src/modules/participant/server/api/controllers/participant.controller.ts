import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { GetParticipantInputDto } from '../../../application/use-cases/get-participant/get-participant.input.dto';
import type { GetParticipantOutputDto } from '../../../application/use-cases/get-participant/get-participant.output.dto';
import type { ListParticipantsInputDto } from '../../../application/use-cases/list-participants/list-participants.input.dto';
import type { ListParticipantsOutputDto } from '../../../application/use-cases/list-participants/list-participants.output.dto';
import type { CloseParticipantSessionInputDto } from '../../../application/use-cases/participant-session/close-participant-session.input.dto';
import type { CloseParticipantSessionOutputDto } from '../../../application/use-cases/participant-session/close-participant-session.output.dto';
import type { OpenParticipantSessionInputDto } from '../../../application/use-cases/participant-session/open-participant-session.input.dto';
import type { OpenParticipantSessionOutputDto } from '../../../application/use-cases/participant-session/open-participant-session.output.dto';
import type { RegisterConsentInputDto } from '../../../application/use-cases/register-consent/register-consent.input.dto';
import type { RegisterConsentOutputDto } from '../../../application/use-cases/register-consent/register-consent.output.dto';
import type { UpdateParticipantInputDto } from '../../../application/use-cases/update-participant/update-participant.input.dto';
import type { UpdateParticipantOutputDto } from '../../../application/use-cases/update-participant/update-participant.output.dto';
import type { ParticipantActionRequest } from '../dtos/participant.request.types';

export type ParticipantControllerDependencies = {
  openSessionUseCase: IUseCase<OpenParticipantSessionInputDto, OpenParticipantSessionOutputDto>;
  closeSessionUseCase: IUseCase<CloseParticipantSessionInputDto, CloseParticipantSessionOutputDto>;
  getParticipantUseCase: IUseCase<GetParticipantInputDto, GetParticipantOutputDto>;
  updateParticipantUseCase: IUseCase<UpdateParticipantInputDto, UpdateParticipantOutputDto>;
  registerConsentUseCase: IUseCase<RegisterConsentInputDto, RegisterConsentOutputDto>;
  listParticipantsUseCase: IUseCase<ListParticipantsInputDto, ListParticipantsOutputDto>;
  sessionCookieName: string;
  sessionTtlMinutes: number;
  cookieSecure: boolean;
};

/** Cadastro mestre, área do participante e consentimentos LGPD (§6, §32, §37). */
export class ParticipantController extends Controller<
  HttpRequestContext<ParticipantActionRequest>,
  HttpResponse
> {
  private readonly dependencies: ParticipantControllerDependencies;

  constructor(dependencies: ParticipantControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<ParticipantActionRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'openSession':
        return this.openSession(request.body.body);
      case 'closeSession':
        return this.closeSession(request.body.token ?? request.sessionToken ?? null);
      case 'me':
        return this.me(request);
      case 'updateProfile':
        return this.updateProfile(request);
      case 'registerConsents':
        return this.registerConsents(request);
      case 'list': {
        const query = request.body.query;
        const result = await this.dependencies.listParticipantsUseCase.execute({
          search: query.search ?? null,
          city: query.city ?? null,
          state: query.state ?? null,
          company: query.company ?? null,
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 20,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value.participants, { ...result.value.meta });
      }
      case 'detail': {
        const result = await this.dependencies.getParticipantUseCase.execute({
          participantId: request.body.participantId,
        });
        if (result.isFailure) return HttpResponse.notFound(result.error.message, 'PARTICIPANT_NOT_FOUND');
        return HttpResponse.ok(result.value);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async openSession(body: { email?: string; cpf?: string }): Promise<HttpResponse> {
    const result = await this.dependencies.openSessionUseCase.execute({
      email: body.email ?? '',
      cpf: body.cpf ?? '',
    });
    if (result.isFailure) return HttpResponse.unauthorized(result.error.message, 'PARTICIPANT_ACCESS_DENIED');

    return HttpResponse.ok({
      participant: result.value.participant,
      expiresAt: result.value.expiresAt,
    }).withCookies([
      {
        name: this.dependencies.sessionCookieName,
        value: result.value.token,
        maxAgeSeconds: this.dependencies.sessionTtlMinutes * 60,
        httpOnly: true,
        secure: this.dependencies.cookieSecure,
        sameSite: 'lax',
        path: '/',
      },
    ]);
  }

  private async closeSession(token: string | null): Promise<HttpResponse> {
    if (token) {
      await this.dependencies.closeSessionUseCase.execute({ token });
    }
    return HttpResponse.ok({ success: true }).withCookies([
      {
        name: this.dependencies.sessionCookieName,
        value: '',
        maxAgeSeconds: 0,
        httpOnly: true,
        secure: this.dependencies.cookieSecure,
        sameSite: 'lax',
        path: '/',
      },
    ]);
  }

  private async me(request: HttpRequestContext<ParticipantActionRequest>): Promise<HttpResponse> {
    const participantId = request.participant?.participantId;
    if (!participantId) return HttpResponse.unauthorized('Sessão de participante necessária', 'PARTICIPANT_UNAUTHORIZED');

    const result = await this.dependencies.getParticipantUseCase.execute({ participantId });
    if (result.isFailure) return HttpResponse.notFound(result.error.message, 'PARTICIPANT_NOT_FOUND');
    return HttpResponse.ok(result.value.participant);
  }

  private async updateProfile(request: HttpRequestContext<ParticipantActionRequest>): Promise<HttpResponse> {
    if (request.body.action !== 'updateProfile') return HttpResponse.badRequest('Ação inválida');
    const participantId = request.participant?.participantId;
    if (!participantId) return HttpResponse.unauthorized('Sessão de participante necessária', 'PARTICIPANT_UNAUTHORIZED');

    const current = await this.dependencies.getParticipantUseCase.execute({ participantId });
    if (current.isFailure) return HttpResponse.notFound(current.error.message, 'PARTICIPANT_NOT_FOUND');

    const body = request.body.body;
    const result = await this.dependencies.updateParticipantUseCase.execute({
      participantId,
      name: body.name ?? current.value.participant.name,
      email: body.email ?? current.value.participant.email,
      phone: body.phone ?? current.value.participant.phone,
      birthDate: body.birthDate ?? current.value.participant.birthDate,
      company: body.company ?? current.value.participant.company,
      jobTitle: body.jobTitle ?? current.value.participant.jobTitle,
      city: body.city ?? current.value.participant.city,
      state: body.state ?? current.value.participant.state,
      actorUserId: request.actor?.userId ?? participantId,
      actorName: request.actor?.name ?? request.participant?.name ?? 'Participante',
      ip: request.ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'PARTICIPANT_UPDATE_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async registerConsents(request: HttpRequestContext<ParticipantActionRequest>): Promise<HttpResponse> {
    if (request.body.action !== 'registerConsents') return HttpResponse.badRequest('Ação inválida');
    const participantId = request.participant?.participantId;
    if (!participantId) return HttpResponse.unauthorized('Sessão de participante necessária', 'PARTICIPANT_UNAUTHORIZED');

    const consents = (request.body.body.consents ?? []).map((consent) => ({
      type: consent.type ?? '',
      version: consent.version ?? '',
      accepted: consent.accepted ?? false,
    }));

    const result = await this.dependencies.registerConsentUseCase.execute({
      participantId,
      consents,
      ip: request.ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'CONSENT_FAILED');
    return HttpResponse.ok(result.value);
  }
}
