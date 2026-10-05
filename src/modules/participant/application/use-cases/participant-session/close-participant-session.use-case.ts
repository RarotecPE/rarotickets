import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { PARTICIPANT_SESSION_REPOSITORY } from '../../../domain/repositories/participant-session-repository.interface';
import type { IParticipantSessionRepository } from '../../../domain/repositories/participant-session-repository.interface';
import type { CloseParticipantSessionInputDto } from './close-participant-session.input.dto';
import type { CloseParticipantSessionOutputDto } from './close-participant-session.output.dto';

export type CloseParticipantSessionDependencies = {
  sessionRepository: IParticipantSessionRepository;
  signatureProvider: ISignatureProvider;
  clock: IClock;
};

export class CloseParticipantSessionUseCase extends UseCase<
  CloseParticipantSessionInputDto,
  CloseParticipantSessionOutputDto
> {
  private readonly sessionRepository: IParticipantSessionRepository;
  private readonly signatureProvider: ISignatureProvider;
  private readonly clock: IClock;

  constructor(dependencies: CloseParticipantSessionDependencies) {
    super();
    this.sessionRepository = dependencies.sessionRepository;
    this.signatureProvider = dependencies.signatureProvider;
    this.clock = dependencies.clock;
  }

  async execute(input: CloseParticipantSessionInputDto): Promise<Result<CloseParticipantSessionOutputDto>> {
    const tokenHash = await this.signatureProvider.hash({
      payload: input.token,
      secret: 'participant-session',
    });
    await this.sessionRepository.revokeByTokenHash(tokenHash, this.clock.now());
    return Result.ok({ success: true });
  }
}
