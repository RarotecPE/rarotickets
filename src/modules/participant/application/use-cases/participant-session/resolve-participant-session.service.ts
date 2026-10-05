import { ApplicationService } from '@core/application/application-service.base';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { ParticipantAccessDeniedError } from '../../../domain/errors/participant-access-denied.error';
import { PARTICIPANT_SESSION_REPOSITORY } from '../../../domain/repositories/participant-session-repository.interface';
import type { IParticipantSessionRepository } from '../../../domain/repositories/participant-session-repository.interface';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';

export type ResolveParticipantSessionParams = { token: string; at: Date };
export type ParticipantSessionActor = { participantId: string; name: string; email: string };

export type ResolveParticipantSessionDependencies = {
  sessionRepository: IParticipantSessionRepository;
  participantRepository: IParticipantRepository;
  signatureProvider: ISignatureProvider;
};

export class ResolveParticipantSessionService extends ApplicationService<
  ResolveParticipantSessionParams,
  ParticipantSessionActor
> {
  private readonly sessionRepository: IParticipantSessionRepository;
  private readonly participantRepository: IParticipantRepository;
  private readonly signatureProvider: ISignatureProvider;

  constructor(dependencies: ResolveParticipantSessionDependencies) {
    super();
    this.sessionRepository = dependencies.sessionRepository;
    this.participantRepository = dependencies.participantRepository;
    this.signatureProvider = dependencies.signatureProvider;
  }

  async execute(params: ResolveParticipantSessionParams): Promise<Result<ParticipantSessionActor>> {
    const tokenHash = await this.signatureProvider.hash({
      payload: params.token,
      secret: 'participant-session',
    });
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (!session || session.revokedAt || session.expiresAt.getTime() <= params.at.getTime()) {
      return Result.fail(new ParticipantAccessDeniedError());
    }

    const participant = await this.participantRepository.findById(session.participantId);
    if (!participant) return Result.fail(new ParticipantAccessDeniedError());

    return Result.ok({
      participantId: participant.id.toString(),
      name: participant.name.value,
      email: participant.email.value,
    });
  }
}
