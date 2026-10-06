import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { UnknownApplicationRoleError } from '../errors/unknown-application-role.error';

export type ApplicationRoleKey =
  | 'ADMINISTRADOR'
  | 'GERENTE_EVENTO'
  | 'FINANCEIRO'
  | 'ATENDIMENTO'
  | 'CHECKIN'
  | 'CONSULTA';

export type ApplicationPermission =
  | 'dashboard:read'
  | 'events:read'
  | 'events:create'
  | 'events:update'
  | 'events:cancel'
  | 'registrations:read'
  | 'participants:read'
  | 'finance:read'
  | 'checkin:manage'
  | 'reports:read';

export type ApplicationRoleProps = {
  key: ApplicationRoleKey;
  label: string;
  permissions: readonly ApplicationPermission[];
};

export type CreateApplicationRoleParams = { key: string };
export type HasPermissionParams = { permission: ApplicationPermission };

const ROLE_DEFINITIONS: Record<ApplicationRoleKey, Omit<ApplicationRoleProps, 'key'>> = {
  ADMINISTRADOR: {
    label: 'Administrador',
    permissions: [
      'dashboard:read', 'events:read', 'events:create', 'events:update', 'events:cancel',
      'registrations:read', 'participants:read', 'finance:read', 'checkin:manage', 'reports:read',
    ],
  },
  GERENTE_EVENTO: {
    label: 'Gerente de eventos',
    permissions: [
      'dashboard:read', 'events:read', 'events:create', 'events:update', 'events:cancel',
      'registrations:read', 'participants:read', 'reports:read',
    ],
  },
  FINANCEIRO: {
    label: 'Financeiro',
    permissions: ['dashboard:read', 'events:read', 'registrations:read', 'finance:read', 'reports:read'],
  },
  ATENDIMENTO: {
    label: 'Atendimento',
    permissions: ['dashboard:read', 'events:read', 'registrations:read', 'participants:read'],
  },
  CHECKIN: {
    label: 'Check-in',
    permissions: ['dashboard:read', 'events:read', 'checkin:manage'],
  },
  CONSULTA: {
    label: 'Consulta',
    permissions: ['dashboard:read', 'events:read', 'registrations:read', 'participants:read', 'reports:read'],
  },
};

export class ApplicationRole extends ValueObject<ApplicationRoleProps> {
  private constructor(props: ApplicationRoleProps) {
    super(props);
  }

  get key(): ApplicationRoleKey {
    return this.props.key;
  }

  get label(): string {
    return this.props.label;
  }

  get permissions(): ApplicationPermission[] {
    return [...this.props.permissions];
  }

  can(params: HasPermissionParams): boolean {
    return this.props.permissions.includes(params.permission);
  }

  static create(params: CreateApplicationRoleParams): Result<ApplicationRole, UnknownApplicationRoleError> {
    const normalizedKey = params.key.trim().toUpperCase() as ApplicationRoleKey;
    const definition = ROLE_DEFINITIONS[normalizedKey];
    if (!definition) {
      return Result.fail(new UnknownApplicationRoleError({ roleKey: params.key }));
    }
    return Result.ok(new ApplicationRole({
      key: normalizedKey,
      label: definition.label,
      permissions: Object.freeze([...definition.permissions]),
    }));
  }
}
