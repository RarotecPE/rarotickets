import { ApplicationService } from '@core/application/application-service.base';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import type { Permission } from '@core/domain/permissions';
import { Result } from '@core/domain/result';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { SESSION_REPOSITORY } from '../../domain/repositories/session-repository.interface';
import type { ISessionRepository } from '../../domain/repositories/session-repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';

export type ResolveSessionParams = { token: string; at: Date };
export type SessionActor = {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
};

export type ResolveSessionDependencies = {
  sessionRepository: ISessionRepository;
  userRepository: IUserRepository;
  signatureProvider: ISignatureProvider;
};

/** Traduz o token de sessão no usuário autenticado (usado pelos middlewares). */
export class ResolveSessionService extends ApplicationService<ResolveSessionParams, SessionActor> {
  private readonly sessionRepository: ISessionRepository;
  private readonly userRepository: IUserRepository;
  private readonly signatureProvider: ISignatureProvider;

  constructor(dependencies: ResolveSessionDependencies) {
    super();
    this.sessionRepository = dependencies.sessionRepository;
    this.userRepository = dependencies.userRepository;
    this.signatureProvider = dependencies.signatureProvider;
  }

  async execute(params: ResolveSessionParams): Promise<Result<SessionActor>> {
    const tokenHash = await this.signatureProvider.hash({ payload: params.token, secret: 'session-token' });
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (!session || !session.isActive(params.at)) return Result.fail(new InvalidCredentialsError());

    const user = await this.userRepository.findById(session.userId);
    if (!user || !user.isActive) return Result.fail(new InvalidCredentialsError());

    return Result.ok({
      userId: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      role: user.role,
      permissions: user.permissions,
    });
  }
}
