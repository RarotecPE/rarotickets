import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS, USER_ROLES } from '@core/domain/permissions';
import type { Permission, UserRole as UserRoleName } from '@core/domain/permissions';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type UserRoleProps = { role: UserRoleName; permissions: Permission[] };

/** Perfil de acesso do usuário interno com suas permissões efetivas (§35). */
export class UserRole extends ValueObject<UserRoleProps> {
  private constructor(props: UserRoleProps) {
    super(props);
  }

  get role(): UserRoleName {
    return this.props.role;
  }

  get label(): string {
    return ROLE_LABELS[this.props.role];
  }

  get permissions(): Permission[] {
    return [...this.props.permissions];
  }

  public static create(params: { role: string; permissions?: readonly string[] }): Result<UserRole> {
    const role = params.role as UserRoleName;
    if (!USER_ROLES.includes(role)) {
      return Result.fail(new Error('Perfil de acesso inválido'));
    }

    // ADMINISTRADOR sempre possui todas as permissões — evita bloqueio total.
    if (role === 'ADMINISTRADOR') {
      return Result.ok(new UserRole({ role, permissions: [...ALL_PERMISSIONS] }));
    }

    const requested = params.permissions ?? ROLE_DEFAULT_PERMISSIONS[role];
    const invalid = requested.filter((permission) => !ALL_PERMISSIONS.includes(permission as Permission));
    if (invalid.length > 0) {
      return Result.fail(new Error(`Permissões inválidas: ${invalid.join(', ')}`));
    }

    const effective = requested.length > 0 ? requested : ROLE_DEFAULT_PERMISSIONS[role];
    return Result.ok(new UserRole({ role, permissions: [...effective] as Permission[] }));
  }

  public static reconstitute(params: UserRoleProps): UserRole {
    return new UserRole({ role: params.role, permissions: [...params.permissions] });
  }

  public can(permission: Permission): boolean {
    return this.props.permissions.includes(permission);
  }
}
