import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import { USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { UserMapper } from '../../mappers/user.mapper';
import type { UpdateUserInputDto } from './update-user.input.dto';
import type { UpdateUserOutputDto } from './update-user.output.dto';

export type UpdateUserDependencies = {
  userRepository: IUserRepository;
  auditRecorder: IAuditRecorder;
  mapper: UserMapper;
};

export class UpdateUserUseCase extends UseCase<UpdateUserInputDto, UpdateUserOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly auditRecorder: IAuditRecorder;
  private readonly mapper: UserMapper;

  constructor(dependencies: UpdateUserDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.auditRecorder = dependencies.auditRecorder;
    this.mapper = dependencies.mapper;
  }

  async execute(input: UpdateUserInputDto): Promise<Result<UpdateUserOutputDto>> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) return Result.fail(new UserNotFoundError({ userId: input.userId }));

    const before = {
      name: user.name.value,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    };

    if (input.name !== undefined) {
      const nameResult = user.changeName(input.name);
      if (nameResult.isFailure) return Result.fail(nameResult.error);
    }

    if (input.role !== undefined || input.permissions !== undefined) {
      const roleResult = user.changeRole({
        role: input.role ?? user.role,
        permissions: input.permissions ?? user.permissions,
      });
      if (roleResult.isFailure) return Result.fail(roleResult.error);
    }

    if (input.isActive === true && !user.isActive) user.activate();
    if (input.isActive === false && user.isActive) {
      const deactivateResult = user.deactivate();
      if (deactivateResult.isFailure) return Result.fail(deactivateResult.error);
    }

    await this.userRepository.update(user);

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'USER_UPDATED',
      entity: 'user',
      entityId: user.id.toString(),
      description: `Usuário ${user.email.value} atualizado`,
      before,
      after: {
        name: user.name.value,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
      ip: input.ip ?? null,
    });

    return Result.ok({ user: this.mapper.map({ user }) });
  }
}
