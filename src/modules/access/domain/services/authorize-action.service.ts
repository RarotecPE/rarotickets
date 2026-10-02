import { DomainService } from '../../../../@core/domain/domain-service.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ForbiddenError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { InternalUser } from '../entities/internal-user.aggregate.ts';
import type { Permission } from '../value-objects/permission.vo.ts';
import type { StaffRole } from '../value-objects/staff-role.vo.ts';

export type RoleGrant = { role: StaffRole; permissions: Permission[] };
export type AuthorizeActionParams = { user: InternalUser; permission: Permission; roleGrants: RoleGrant[] };

/** Role-to-permission mapping is injected so an undocumented role matrix is not hard-coded. */
export class AuthorizeActionService extends DomainService<AuthorizeActionParams, boolean, ForbiddenError> {
  public execute(params: AuthorizeActionParams): Result<boolean, ForbiddenError> {
    if (!params.user.isActive) {
      return Result.fail(new ForbiddenError({ code: 'INACTIVE_INTERNAL_USER', message: 'O usuário interno está inativo.' }));
    }
    if (params.user.hasRole('ADMINISTRADOR') || params.user.hasDirectPermission(params.permission)) {
      return Result.ok(true);
    }
    const isGranted = params.roleGrants.some((grant) => params.user.hasRole(grant.role)
      && grant.permissions.includes(params.permission));
    return Result.ok(isGranted);
  }
}
