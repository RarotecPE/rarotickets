import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { onlyDigits } from '@core/domain/validators/document.validator';
import { addMinutes } from '../../../../../shared/utils/date.util';
import { ParticipantAccessDeniedError } from '../../../domain/errors/participant-access-denied.error';
import { PARTICIPANT_SESSION_REPOSITORY } from '../../../domain/repositories/participant-session-repository.interface';
import type { IParticipantSessionRepository } from '../../../domain/repositories/participant-session-repository.interface';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { OpenParticipantSessionInputDto } from './open-participant-session.input.dto';
import type { OpenParticipantSessionOutputDto } from './open-participant-session.output.dto';

export type OpenParticipantSessionDependencies = {
  participantRepository: IParticipantRepository;
  sessionRepository: IParticipantSessionRepository;
  signatureProvider: ISignatureProvider;
  clock: IClock;
  mapper: ParticipantMapper;
  sessionTtlMinutes: number;
};

/**
 * Acesso à área do participante (§32). A identificação exige e-mail + CPF do
 * cadastro principal, garantindo que ninguém consulte dados de terceiros.
 */
export class OpenParticipantSessionUseCase extends UseCase<
  OpenParticipantSessionInputDto,
  OpenParticipantSessionOutputDto
> {
  private readonly participantRepository: IParticipantRepository;
  private readonly sessionRepository: IParticipantSessionRepository;
  private readonly signatureProvider: ISignatureProvider;
  private readonly clock: IClock;
  private readonly mapper: ParticipantMapper;
  private readonly sessionTtlMinutes: number;

  constructor(dependencies: OpenParticipantSessionDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.sessionRepository = dependencies.sessionRepository;
    this.signatureProvider = dependencies.signatureProvider;
    this.clock = dependencies.clock;
    this.mapper = dependencies.mapper;
    this.sessionTtlMinutes = dependencies.sessionTtlMinutes;
  }

  async execute(input: OpenParticipantSessionInputDto): Promise<Result<OpenParticipantSessionOutputDto>> {
    const participant = await this.participantRepository.findByEmail(input.email ?? '');
    if (!participant) return Result.fail(new ParticipantAccessDeniedError());

    const informedCpf = onlyDigits(input.cpf ?? '');
    const registeredCpf = participant.cpf?.value ?? '';
    if (!informedCpf || informedCpf !== registeredCpf) {
      return Result.fail(new ParticipantAccessDeniedError());
    }

    const now = this.clock.now();
    const token = await this.signatureProvider.generateToken({ bytes: 32 });
    const tokenHash = await this.signatureProvider.hash({ payload: token, secret: 'participant-session' });
    const expiresAt = addMinutes(now, this.sessionTtlMinutes);

    await this.sessionRepository.save({
      participantId: participant.id.toString(),
      tokenHash,
      expiresAt,
    });

    return Result.ok({
      token,
      expiresAt,
      participant: await this.mapper.map({ participant }),
    });
  }
}
