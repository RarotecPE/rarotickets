import { ValueObject } from '../../../../@core/domain/value-object.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { StaffRole } from './staff-role.vo.ts';
export type Permission =
  | 'event:create'
  | 'event:edit'
  | 'event:publish'
  | 'event:cancel'
  | 'participant:view'
  | 'participant:edit'
  | 'participant:export'
  | 'participant:anonymize'
  | 'registration:view'
  | 'registration:create'
  | 'registration:override-closed-window'
  | 'registration:cancel'
  | 'registration:manual-confirm'
  | 'registration:promote-waitlist'
  | 'coupon:manage'
  | 'payment:view'
  | 'payment:create'
  | 'payment:cancel'
  | 'payment:refund'
  | 'checkin:perform'
  | 'checkin:correct'
  | 'certificate:issue'
  | 'report:view'
  | 'permission:manage';
export type PermissionProps = { value: Permission };
export type CreatePermissionParams = { value: string };

export class PermissionValue extends ValueObject<PermissionProps> {
  private constructor(props: PermissionProps) {
    super(props);
  }

  public get value(): Permission { return this.props.value; }

  public static create(params: CreatePermissionParams): Result<PermissionValue, ValidationError> {
    const validPermissions: Permission[] = [
      'event:create', 'event:edit', 'event:publish', 'event:cancel',
      'participant:view', 'participant:edit', 'participant:export', 'participant:anonymize',
      'registration:view', 'registration:create', 'registration:override-closed-window', 'registration:cancel', 'registration:manual-confirm', 'registration:promote-waitlist',
      'coupon:manage', 'payment:view', 'payment:create', 'payment:cancel', 'payment:refund',
      'checkin:perform', 'checkin:correct', 'certificate:issue', 'report:view', 'permission:manage',
    ];
    if (!validPermissions.includes(params.value as Permission)) {
      return Result.fail(new ValidationError({ code: 'PERMISSION_INVALID', message: 'A permissão informada não existe.' }));
    }
    return Result.ok(new PermissionValue({ value: params.value as Permission }));
  }
}
