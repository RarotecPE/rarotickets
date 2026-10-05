import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { User } from '../../../domain/entities/user.entity';
import { UserEmailAlreadyInUseError } from '../../../domain/errors/user-email-already-in-use.error';
import { USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { PASSWORD_HASHER } from '../../../domain/services/password-hasher.interface';
import type { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { Password } from '../../../domain/value-objects/password.vo';
import { UserEmail } from '../../../domain/value-objects/user-email.vo';
import { UserMapper } from '../../mappers/user.mapper';
import type { CreateUserInputDto } from './create-user.input.dto';
import type { CreateUserOutputDto } from './create-user.output.dto';

export type CreateUserDependencies = {
  userRepository: IUserRepository;
  passwordHasher: IPasswordHasher;
  auditRecorder: IAuditRecorder;
  mapper: UserMapper;
};

export class CreateUserUseCase extends UseCase<CreateUserInputDto, CreateUserOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly auditRecorder: IAuditRecorder;
  private readonly mapper: UserMapper;

  constructor(dependencies: CreateUserDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.auditRecorder = dependencies.auditRecorder;
    this.mapper = dependencies.mapper;
  }

  async execute(input: CreateUserInputDto): Promise<Result<CreateUserOutputDto>> {
    const passwordResult = Password.create(input.password);
    if (passwordResult.isFailure) return Result.fail(passwordResult.error);

    const emailResult = UserEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    if (await this.userRepository.existsByEmail(emailResult.value)) {
      return Result.fail(new UserEmailAlreadyInUseError({ email: emailResult.value.value }));
    }

    const passwordHash = await this.passwordHasher.hash({ plain: passwordResult.value.value });
    const userResult = User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      permissions: input.permissions,
    });
    if (userResult.isFailure) return Result.fail(userResult.error);

    const user = userResult.value;
    await this.userRepository.save(user);

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'USER_CREATED',
      entity: 'user',
      entityId: user.id.toString(),
      description: `Usuário ${user.email.value} criado com perfil ${user.role}`,
      after: { email: user.email.value, role: user.role, permissions: user.permissions },
      ip: input.ip ?? null,
    });

    return Result.ok({ user: this.mapper.map({ user }) });
  }
}
