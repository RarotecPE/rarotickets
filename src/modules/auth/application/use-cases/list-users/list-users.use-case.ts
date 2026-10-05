import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { UserMapper } from '../../mappers/user.mapper';
import type { ListUsersInputDto } from './list-users.input.dto';
import type { ListUsersOutputDto } from './list-users.output.dto';

export type ListUsersDependencies = { userRepository: IUserRepository; mapper: UserMapper };

export class ListUsersUseCase extends UseCase<ListUsersInputDto, ListUsersOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly mapper: UserMapper;

  constructor(dependencies: ListUsersDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ListUsersInputDto): Promise<Result<ListUsersOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { users, total } = await this.userRepository.list({
      search: input.search ?? null,
      role: input.role ?? null,
      isActive: input.isActive ?? null,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    return Result.ok({
      users: users.map((user) => this.mapper.map({ user })),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
