import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { SESSION_REPOSITORY } from '../../../domain/repositories/session-repository.interface';
import type { ISessionRepository } from '../../../domain/repositories/session-repository.interface';
import type { LogoutInputDto } from './logout.input.dto';
import type { LogoutOutputDto } from './logout.output.dto';

export type LogoutDependencies = {
  sessionRepository: ISessionRepository;
  signatureProvider: ISignatureProvider;
  clock: IClock;
};

export class LogoutUseCase extends UseCase<LogoutInputDto, LogoutOutputDto> {
  private readonly sessionRepository: ISessionRepository;
  private readonly signatureProvider: ISignatureProvider;
  private readonly clock: IClock;

  constructor(dependencies: LogoutDependencies) {
    super();
    this.sessionRepository = dependencies.sessionRepository;
    this.signatureProvider = dependencies.signatureProvider;
    this.clock = dependencies.clock;
  }

  async execute(input: LogoutInputDto): Promise<Result<LogoutOutputDto>> {
    const tokenHash = await this.signatureProvider.hash({ payload: input.token, secret: 'session-token' });
    await this.sessionRepository.revokeByTokenHash(tokenHash, this.clock.now());
    return Result.ok({ success: true });
  }
}
