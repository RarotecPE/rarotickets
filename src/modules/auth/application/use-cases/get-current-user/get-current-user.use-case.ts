import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import { USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { UserMapper } from '../../mappers/user.mapper';
import type { GetCurrentUserInputDto } from './get-current-user.input.dto';
import type { GetCurrentUserOutputDto } from './get-current-user.output.dto';

export type GetCurrentUserDependencies = { userRepository: IUserRepository; mapper: UserMapper };

export class GetCurrentUserUseCase extends UseCase<GetCurrentUserInputDto, GetCurrentUserOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly mapper: UserMapper;

  constructor(dependencies: GetCurrentUserDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(input: GetCurrentUserInputDto): Promise<Result<GetCurrentUserOutputDto>> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) return Result.fail(new UserNotFoundError({ userId: input.userId }));
    return Result.ok({ user: this.mapper.map({ user }) });
  }
}
