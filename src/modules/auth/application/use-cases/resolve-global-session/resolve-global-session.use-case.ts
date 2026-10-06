import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { InactiveGlobalSessionError } from '../../../domain/errors/inactive-global-session.error';
import { InvalidGlobalIdentityError } from '../../../domain/errors/invalid-global-identity.error';
import { AuthSession } from '../../../domain/entities/auth-session.entity';
import type { IRaroNexusProvider } from '../../../domain/services/raro-nexus-provider.interface';
import { ApplicationRole } from '../../../domain/value-objects/application-role.vo';
import { GlobalIdentity } from '../../../domain/value-objects/global-identity.vo';
import { AuthSessionMapper } from '../../mappers/auth-session.mapper';
import type { ResolveGlobalSessionInputDto } from './resolve-global-session.input.dto';
import type { ResolveGlobalSessionOutputDto } from './resolve-global-session.output.dto';

export type ResolveGlobalSessionDependencies = {
  provider: IRaroNexusProvider;
  mapper: AuthSessionMapper;
};

export class ResolveGlobalSessionUseCase extends UseCase<
  ResolveGlobalSessionInputDto,
  ResolveGlobalSessionOutputDto
> {
  private readonly provider: IRaroNexusProvider;
  private readonly mapper: AuthSessionMapper;

  constructor(dependencies: ResolveGlobalSessionDependencies) {
    super();
    this.provider = dependencies.provider;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ResolveGlobalSessionInputDto): Promise<Result<ResolveGlobalSessionOutputDto>> {
    const globalSession = await this.provider.introspectGlobalSession({ token: input.token });
    if (!globalSession.active) return Result.fail(new InactiveGlobalSessionError());
    if (!globalSession.user || !globalSession.role) {
      return Result.fail(new InvalidGlobalIdentityError());
    }
    const identityResult = GlobalIdentity.create(globalSession.user);
    if (identityResult.isFailure) return Result.fail(identityResult.error);
    const roleResult = ApplicationRole.create({ key: globalSession.role.key });
    if (roleResult.isFailure) return Result.fail(roleResult.error);
    const sessionResult = AuthSession.create({ user: identityResult.value, role: roleResult.value });
    if (sessionResult.isFailure) return Result.fail(sessionResult.error);
    return Result.ok(this.mapper.map({ session: sessionResult.value }));
  }
}
