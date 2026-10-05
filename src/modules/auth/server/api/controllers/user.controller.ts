import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext, RequestActor } from '@server/api/http-request.types';
import type { CreateUserInputDto } from '../../../application/use-cases/create-user/create-user.input.dto';
import type { CreateUserOutputDto } from '../../../application/use-cases/create-user/create-user.output.dto';
import type { ListUsersInputDto } from '../../../application/use-cases/list-users/list-users.input.dto';
import type { ListUsersOutputDto } from '../../../application/use-cases/list-users/list-users.output.dto';
import type { UpdateUserInputDto } from '../../../application/use-cases/update-user/update-user.input.dto';
import type { UpdateUserOutputDto } from '../../../application/use-cases/update-user/update-user.output.dto';
import type { UserActionRequest } from '../dtos/user.request.types';

export type UserControllerDependencies = {
  createUserUseCase: IUseCase<CreateUserInputDto, CreateUserOutputDto>;
  updateUserUseCase: IUseCase<UpdateUserInputDto, UpdateUserOutputDto>;
  listUsersUseCase: IUseCase<ListUsersInputDto, ListUsersOutputDto>;
};

export class UserController extends Controller<HttpRequestContext<UserActionRequest>, HttpResponse> {
  private readonly dependencies: UserControllerDependencies;

  constructor(dependencies: UserControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<UserActionRequest>): Promise<HttpResponse> {
    const actor = request.actor;
    if (!actor) return HttpResponse.unauthorized();

    switch (request.body.action) {
      case 'list':
        return this.list(request.body.query);
      case 'create':
        return this.create(request.body.body, actor, request.ip);
      case 'update':
        return this.update(request.body.userId, request.body.body, actor, request.ip);
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async list(query: Extract<UserActionRequest, { action: 'list' }>['query']): Promise<HttpResponse> {
    const result = await this.dependencies.listUsersUseCase.execute({
      search: query.search ?? null,
      role: query.role ?? null,
      isActive: query.isActive === undefined ? null : query.isActive === 'true',
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 20,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.users, { ...result.value.meta });
  }

  private async create(
    body: Extract<UserActionRequest, { action: 'create' }>['body'],
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.createUserUseCase.execute({
      ...body,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'USER_CREATE_FAILED');
    return HttpResponse.created(result.value);
  }

  private async update(
    userId: string,
    body: Extract<UserActionRequest, { action: 'update' }>['body'],
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.updateUserUseCase.execute({
      userId,
      ...body,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'USER_UPDATE_FAILED');
    return HttpResponse.ok(result.value);
  }
}
