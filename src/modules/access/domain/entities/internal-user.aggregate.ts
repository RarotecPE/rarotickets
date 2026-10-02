import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Email } from '../../../../@core/domain/value-objects/email.vo.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { Permission } from '../value-objects/permission.vo.ts';
import type { StaffRole } from '../value-objects/staff-role.vo.ts';

export type InternalUserProps = {
  name: string;
  email: string;
  roles: StaffRole[];
  directPermissions: Permission[];
  isActive: boolean;
};
export type CreateInternalUserParams = {
  id?: string;
  name: string;
  email: string;
  roles: StaffRole[];
  directPermissions: Permission[];
  now?: Date;
};
export type UpdateInternalUserAccessParams = { roles: StaffRole[]; directPermissions: Permission[]; now: Date };
export type SetInternalUserActiveParams = { isActive: boolean; now: Date };
export type InternalUserSnapshot = InternalUserProps & { id: string; createdAt: Date; updatedAt: Date };

export class InternalUser extends AggregateRoot<InternalUserProps> {
  private constructor(params: EntityConstructorParams<InternalUserProps>) {
    super(params);
  }

  public static create(params: CreateInternalUserParams): Result<InternalUser, ValidationError> {
    const email = Email.create(params.email);
    if (email.isFailure) return Result.fail(email.error);
    if (!params.name.trim()) {
      return Result.fail(new ValidationError({ code: 'INTERNAL_USER_NAME_REQUIRED', message: 'O nome do usuário interno é obrigatório.' }));
    }
    const entityParams: EntityConstructorParams<InternalUserProps> = {
      props: {
        name: params.name.trim(),
        email: email.value.value,
        roles: this.unique(params.roles),
        directPermissions: this.unique(params.directPermissions),
        isActive: true,
      },
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new InternalUser(entityParams));
  }

  public get name(): string { return this.props.name; }
  public get email(): string { return this.props.email; }
  public get roles(): StaffRole[] { return [...this.props.roles]; }
  public get directPermissions(): Permission[] { return [...this.props.directPermissions]; }
  public get isActive(): boolean { return this.props.isActive; }

  public updateAccess(params: UpdateInternalUserAccessParams): Result<void, ValidationError> {
    this.props.roles = InternalUser.unique(params.roles);
    this.props.directPermissions = InternalUser.unique(params.directPermissions);
    this.touch({ at: params.now });
    return Result.ok();
  }

  public setActive(params: SetInternalUserActiveParams): Result<void, InvalidStateError> {
    if (this.props.isActive === params.isActive) {
      return Result.fail(new InvalidStateError({ code: 'INTERNAL_USER_STATE_UNCHANGED', message: 'O estado do usuário já corresponde à alteração solicitada.' }));
    }
    this.props.isActive = params.isActive;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public hasRole(role: StaffRole): boolean {
    return this.props.roles.includes(role);
  }

  public hasDirectPermission(permission: Permission): boolean {
    return this.props.directPermissions.includes(permission);
  }

  public snapshot(): InternalUserSnapshot {
    return {
      name: this.props.name,
      email: this.props.email,
      roles: this.roles,
      directPermissions: this.directPermissions,
      isActive: this.props.isActive,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static unique<T>(items: T[]): T[] {
    return [...new Set(items)];
  }
}
