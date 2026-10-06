import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import type { IRaroNexusProvider } from '../../../domain/services/raro-nexus-provider.interface';
import { AuthSession } from '../../../domain/entities/auth-session.entity';
import { ApplicationRole } from '../../../domain/value-objects/application-role.vo';
import { GlobalIdentity } from '../../../domain/value-objects/global-identity.vo';
import { AuthSessionMapper } from '../../mappers/auth-session.mapper';
import type { CompleteRaroNexusLoginInputDto } from './complete-raro-nexus-login.input.dto';
import type { CompleteRaroNexusLoginOutputDto } from './complete-raro-nexus-login.output.dto';

export type CompleteRaroNexusLoginDependencies = {
  provider: IRaroNexusProvider;
  mapper: AuthSessionMapper;
};

export class CompleteRaroNexusLoginUseCase extends UseCase<
  CompleteRaroNexusLoginInputDto,
  CompleteRaroNexusLoginOutputDto
> {
  private readonly provider: IRaroNexusProvider;
  private readonly mapper: AuthSessionMapper;

  constructor(dependencies: CompleteRaroNexusLoginDependencies) {
    super();
    this.provider = dependencies.provider;
    this.mapper = dependencies.mapper;
  }

  async execute(input: CompleteRaroNexusLoginInputDto): Promise<Result<CompleteRaroNexusLoginOutputDto>> {
    const globalSession = await this.provider.exchangeAuthorizationCode(input);
    const identityResult = GlobalIdentity.create(globalSession.user);
    if (identityResult.isFailure) return Result.fail(identityResult.error);
    const roleResult = ApplicationRole.create({ key: globalSession.role.key });
    if (roleResult.isFailure) return Result.fail(roleResult.error);
    const sessionResult = AuthSession.create({ user: identityResult.value, role: roleResult.value });
    if (sessionResult.isFailure) return Result.fail(sessionResult.error);
    return Result.ok({ token: globalSession.token, session: this.mapper.map({ session: sessionResult.value }) });
  }
}
