import { ValueObject } from '../../../../@core/domain/value-object.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type StaffRole = 'ADMINISTRADOR' | 'GERENTE_EVENTO' | 'FINANCEIRO' | 'ATENDIMENTO' | 'CHECKIN' | 'CONSULTA';
export type StaffRoleProps = { value: StaffRole };
export type CreateStaffRoleParams = { value: string };

export class StaffRoleValue extends ValueObject<StaffRoleProps> {
  private constructor(props: StaffRoleProps) {
    super(props);
  }

  public get value(): StaffRole { return this.props.value; }

  public static create(params: CreateStaffRoleParams): Result<StaffRoleValue, ValidationError> {
    const roles: StaffRole[] = ['ADMINISTRADOR', 'GERENTE_EVENTO', 'FINANCEIRO', 'ATENDIMENTO', 'CHECKIN', 'CONSULTA'];
    if (!roles.includes(params.value as StaffRole)) {
      return Result.fail(new ValidationError({ code: 'STAFF_ROLE_INVALID', message: 'O perfil de acesso informado não existe.' }));
    }
    return Result.ok(new StaffRoleValue({ value: params.value as StaffRole }));
  }
}
