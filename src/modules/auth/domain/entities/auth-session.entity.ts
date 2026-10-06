import { Entity } from '../../../../@core/domain/entity.base';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base';
import { Result } from '../../../../@core/domain/result';
import type { ApplicationRole } from '../value-objects/application-role.vo';
import type { GlobalIdentity } from '../value-objects/global-identity.vo';

export type AuthSessionProps = {
  user: GlobalIdentity;
  role: ApplicationRole;
};

export type AuthSessionConstructorParams = EntityConstructorParams<AuthSessionProps>;
export type CreateAuthSessionParams = AuthSessionProps;

export class AuthSession extends Entity<AuthSessionProps> {
  private constructor(params: AuthSessionConstructorParams) {
    super(params);
  }

  get user(): GlobalIdentity {
    return this.props.user;
  }

  get role(): ApplicationRole {
    return this.props.role;
  }

  static create(params: CreateAuthSessionParams): Result<AuthSession> {
    return Result.ok(new AuthSession({ props: params }));
  }
}
