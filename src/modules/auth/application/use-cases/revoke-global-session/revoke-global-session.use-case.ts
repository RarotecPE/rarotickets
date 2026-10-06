import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import type { IRaroNexusProvider } from '../../../domain/services/raro-nexus-provider.interface';
import type { RevokeGlobalSessionInputDto } from './revoke-global-session.input.dto';
import type { RevokeGlobalSessionOutputDto } from './revoke-global-session.output.dto';

export type RevokeGlobalSessionDependencies = { provider: IRaroNexusProvider };

export class RevokeGlobalSessionUseCase extends UseCase<
  RevokeGlobalSessionInputDto,
  RevokeGlobalSessionOutputDto
> {
  private readonly provider: IRaroNexusProvider;

  constructor(dependencies: RevokeGlobalSessionDependencies) {
    super();
    this.provider = dependencies.provider;
  }

  async execute(input: RevokeGlobalSessionInputDto): Promise<Result<RevokeGlobalSessionOutputDto>> {
    const revoked = await this.provider.revokeGlobalSession({ token: input.token });
    return Result.ok({ revoked });
  }
}
