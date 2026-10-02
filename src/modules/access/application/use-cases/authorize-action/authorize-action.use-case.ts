import { UseCase } from '../../../../../@core/application/use-case.base.ts';
import type { AuthorizeActionParams, IAuthorizationService } from '../../../../../@core/application/authorization.interface.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import { Result } from '../../../../../@core/domain/result.ts';
import { NotFoundError } from '../../../../../@core/domain/errors/domain-errors.ts';
import { PermissionValue } from '../../../domain/value-objects/permission.vo.ts';
import type { IInternalUserRepository } from '../../../domain/repositories/internal-user-repository.interface.ts';
import { AuthorizeActionService } from '../../../domain/services/authorize-action.service.ts';
import type { RoleGrant } from '../../../domain/services/authorize-action.service.ts';
import type { AuthorizeActionOutputDto } from './authorize-action.output.dto.ts';

export type AuthorizeActionInput = AuthorizeActionParams;
export type AuthorizeActionDependencies = {
  internalUserRepository: IInternalUserRepository;
  authorizationPolicy: AuthorizeActionService;
  roleGrants: RoleGrant[];
};

export class AuthorizeActionUseCase extends UseCase<AuthorizeActionInput, AuthorizeActionOutputDto, DomainError> implements IAuthorizationService {
  private readonly internalUserRepository: IInternalUserRepository;
  private readonly authorizationPolicy: AuthorizeActionService;
  private readonly roleGrants: RoleGrant[];

  constructor(dependencies: AuthorizeActionDependencies) {
    super();
    this.internalUserRepository = dependencies.internalUserRepository;
    this.authorizationPolicy = dependencies.authorizationPolicy;
    this.roleGrants = dependencies.roleGrants.map((grant) => ({ role: grant.role, permissions: [...grant.permissions] }));
  }

  public async execute(input: AuthorizeActionInput): Promise<Result<AuthorizeActionOutputDto, DomainError>> {
    const result = await this.authorize(input);
    if (result.isFailure) return Result.fail(result.error);
    return Result.ok({ isAllowed: result.value });
  }

  public async authorize(params: AuthorizeActionParams): Promise<Result<boolean, DomainError>> {
    const user = await this.internalUserRepository.findById(params.actorId);
    if (!user) return Result.fail(new NotFoundError({ code: 'INTERNAL_USER_NOT_FOUND', message: 'Usuário interno não encontrado.' }));
    const permissionResult = PermissionValue.create({ value: params.permission });
    if (permissionResult.isFailure) return Result.fail(permissionResult.error);
    const policyResult = this.authorizationPolicy.execute({
      user,
      permission: permissionResult.value.value,
      roleGrants: this.roleGrants,
    });
    if (policyResult.isFailure) return Result.fail(policyResult.error);
    return Result.ok(policyResult.value);
  }
}
