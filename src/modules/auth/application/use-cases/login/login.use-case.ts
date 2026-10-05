import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { SIGNATURE_PROVIDER } from '@core/contracts/signature-provider.contract';
import type { ISignatureProvider } from '@core/contracts/signature-provider.contract';
import { Result } from '@core/domain/result';
import { addMinutes } from '../../../../../shared/utils/date.util';
import { Session } from '../../../domain/entities/session.entity';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { UserInactiveError } from '../../../domain/errors/user-inactive.error';
import { SESSION_REPOSITORY } from '../../../domain/repositories/session-repository.interface';
import type { ISessionRepository } from '../../../domain/repositories/session-repository.interface';
import { USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { PASSWORD_HASHER } from '../../../domain/services/password-hasher.interface';
import type { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { UserEmail } from '../../../domain/value-objects/user-email.vo';
import { UserMapper } from '../../mappers/user.mapper';
import type { LoginInputDto } from './login.input.dto';
import type { LoginOutputDto } from './login.output.dto';

export type LoginDependencies = {
  userRepository: IUserRepository;
  sessionRepository: ISessionRepository;
  passwordHasher: IPasswordHasher;
  signatureProvider: ISignatureProvider;
  clock: IClock;
  sessionTtlMinutes: number;
  mapper: UserMapper;
};
export type LoginContext = { userAgent?: string | null; ip?: string | null };

export class LoginUseCase extends UseCase<LoginInputDto & LoginContext, LoginOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly signatureProvider: ISignatureProvider;
  private readonly clock: IClock;
  private readonly sessionTtlMinutes: number;
  private readonly mapper: UserMapper;

  constructor(dependencies: LoginDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.sessionRepository = dependencies.sessionRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.signatureProvider = dependencies.signatureProvider;
    this.clock = dependencies.clock;
    this.sessionTtlMinutes = dependencies.sessionTtlMinutes;
    this.mapper = dependencies.mapper;
  }

  async execute(input: LoginInputDto & LoginContext): Promise<Result<LoginOutputDto>> {
    const emailResult = UserEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(new InvalidCredentialsError());

    const user = await this.userRepository.findByEmail(emailResult.value);
    if (!user) return Result.fail(new InvalidCredentialsError());

    const passwordMatches = await this.passwordHasher.compare({
      plain: input.password,
      hashed: user.passwordHash,
    });
    if (!passwordMatches) return Result.fail(new InvalidCredentialsError());
    if (!user.isActive) return Result.fail(new UserInactiveError());

    const now = this.clock.now();
    const token = await this.signatureProvider.generateToken({ bytes: 32 });
    const tokenHash = await this.signatureProvider.hash({ payload: token, secret: 'session-token' });
    const expiresAt = addMinutes(now, this.sessionTtlMinutes);

    await this.sessionRepository.save(
      Session.create({
        userId: user.id.toString(),
        tokenHash,
        expiresAt,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
      }),
    );

    user.recordLogin(now);
    await this.userRepository.update(user);

    return Result.ok({ token, expiresAt, user: this.mapper.map({ user }) });
  }
}
