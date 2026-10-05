import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import type { Permission } from '@core/domain/permissions';
import { Result } from '@core/domain/result';
import { UserEmail } from '../value-objects/user-email.vo';
import { UserName } from '../value-objects/user-name.vo';
import { UserRole } from '../value-objects/user-role.vo';

export type UserProps = {
  name: UserName;
  email: UserEmail;
  passwordHash: string;
  access: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
};
export type UserConstructorParams = EntityConstructorParams<UserProps>;
export type CreateUserParams = {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  permissions?: readonly string[];
  createdBy?: string | null;
};
export type ReconstituteUserParams = UserConstructorParams & { id: NonNullable<UserConstructorParams['id']> };
export type ChangeUserRoleParams = { role: string; permissions?: readonly string[] };

export class User extends AggregateRoot<UserProps> {
  private constructor(params: UserConstructorParams) {
    super(params);
  }

  get name(): UserName { return this.props.name; }
  get email(): UserEmail { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get access(): UserRole { return this.props.access; }
  get role(): string { return this.props.access.role; }
  get permissions(): Permission[] { return this.props.access.permissions; }
  get isActive(): boolean { return this.props.isActive; }
  get lastLoginAt(): Date | null { return this.props.lastLoginAt; }

  public static create(params: CreateUserParams): Result<User> {
    const nameResult = UserName.create(params.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    const emailResult = UserEmail.create(params.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const accessResult = UserRole.create({ role: params.role, permissions: params.permissions });
    if (accessResult.isFailure) return Result.fail(accessResult.error);

    if (!params.passwordHash) return Result.fail(new Error('Hash de senha é obrigatório'));

    return Result.ok(new User({
      props: {
        name: nameResult.value,
        email: emailResult.value,
        passwordHash: params.passwordHash,
        access: accessResult.value,
        isActive: true,
        lastLoginAt: null,
      },
    }));
  }

  public static reconstitute(params: ReconstituteUserParams): User {
    return new User(params);
  }

  public changeName(name: string): Result<void> {
    const nameResult = UserName.create(name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    this.props.name = nameResult.value;
    this.touch();
    return Result.ok();
  }

  public changeRole(params: ChangeUserRoleParams): Result<void> {
    const accessResult = UserRole.create({ role: params.role, permissions: params.permissions });
    if (accessResult.isFailure) return Result.fail(accessResult.error);
    this.props.access = accessResult.value;
    this.touch();
    return Result.ok();
  }

  public deactivate(): Result<void> {
    if (!this.props.isActive) return Result.fail(new Error('Usuário já está inativo'));
    this.props.isActive = false;
    this.touch();
    return Result.ok();
  }

  public activate(): Result<void> {
    if (this.props.isActive) return Result.fail(new Error('Usuário já está ativo'));
    this.props.isActive = true;
    this.touch();
    return Result.ok();
  }

  public updatePasswordHash(passwordHash: string): Result<void> {
    if (!passwordHash) return Result.fail(new Error('Hash de senha é obrigatório'));
    this.props.passwordHash = passwordHash;
    this.touch();
    return Result.ok();
  }

  public recordLogin(at: Date): void {
    this.props.lastLoginAt = at;
    this.touch();
  }

  public can(permission: Permission): boolean {
    if (!this.props.isActive) return false;
    return this.props.access.can(permission);
  }
}
