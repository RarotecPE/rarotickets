/**
 * Permissões do sistema (§35). Vivem no núcleo porque são compartilhadas pelo
 * domínio (autorização), pela API e pela interface — sem duplicar definições.
 */
export type Permission =
  | 'EVENT_CREATE'
  | 'EVENT_UPDATE'
  | 'EVENT_CANCEL'
  | 'EVENT_PUBLISH'
  | 'PARTICIPANT_VIEW'
  | 'PARTICIPANT_UPDATE'
  | 'REGISTRATION_VIEW'
  | 'REGISTRATION_MANAGE'
  | 'PAYMENT_VIEW'
  | 'PAYMENT_MANAGE'
  | 'PAYMENT_REFUND'
  | 'COUPON_MANAGE'
  | 'CHECKIN_PERFORM'
  | 'CERTIFICATE_ISSUE'
  | 'REPORT_VIEW'
  | 'USER_MANAGE'
  | 'AUDIT_VIEW'
  | 'COMMUNICATION_MANAGE';

export const ALL_PERMISSIONS: readonly Permission[] = [
  'EVENT_CREATE',
  'EVENT_UPDATE',
  'EVENT_CANCEL',
  'EVENT_PUBLISH',
  'PARTICIPANT_VIEW',
  'PARTICIPANT_UPDATE',
  'REGISTRATION_VIEW',
  'REGISTRATION_MANAGE',
  'PAYMENT_VIEW',
  'PAYMENT_MANAGE',
  'PAYMENT_REFUND',
  'COUPON_MANAGE',
  'CHECKIN_PERFORM',
  'CERTIFICATE_ISSUE',
  'REPORT_VIEW',
  'USER_MANAGE',
  'AUDIT_VIEW',
  'COMMUNICATION_MANAGE',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  EVENT_CREATE: 'Criar evento',
  EVENT_UPDATE: 'Editar evento',
  EVENT_CANCEL: 'Cancelar evento',
  EVENT_PUBLISH: 'Publicar evento',
  PARTICIPANT_VIEW: 'Visualizar participante',
  PARTICIPANT_UPDATE: 'Alterar participante',
  REGISTRATION_VIEW: 'Visualizar inscrições',
  REGISTRATION_MANAGE: 'Gerenciar inscrições',
  PAYMENT_VIEW: 'Visualizar pagamentos',
  PAYMENT_MANAGE: 'Gerenciar pagamentos',
  PAYMENT_REFUND: 'Realizar estorno',
  COUPON_MANAGE: 'Gerenciar cupons',
  CHECKIN_PERFORM: 'Realizar check-in',
  CERTIFICATE_ISSUE: 'Emitir certificado',
  REPORT_VIEW: 'Consultar relatórios',
  USER_MANAGE: 'Gerenciar usuários e permissões',
  AUDIT_VIEW: 'Consultar auditoria',
  COMMUNICATION_MANAGE: 'Gerenciar comunicações',
};

export type UserRole =
  | 'ADMINISTRADOR'
  | 'GERENTE_EVENTO'
  | 'FINANCEIRO'
  | 'ATENDIMENTO'
  | 'CHECKIN'
  | 'CONSULTA';

export const USER_ROLES: readonly UserRole[] = [
  'ADMINISTRADOR',
  'GERENTE_EVENTO',
  'FINANCEIRO',
  'ATENDIMENTO',
  'CHECKIN',
  'CONSULTA',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_EVENTO: 'Gerente de evento',
  FINANCEIRO: 'Financeiro',
  ATENDIMENTO: 'Atendimento',
  CHECKIN: 'Check-in',
  CONSULTA: 'Consulta',
};

/** Permissões concedidas por padrão a cada perfil (§35). */
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMINISTRADOR: ALL_PERMISSIONS,
  GERENTE_EVENTO: [
    'EVENT_CREATE',
    'EVENT_UPDATE',
    'EVENT_CANCEL',
    'EVENT_PUBLISH',
    'PARTICIPANT_VIEW',
    'PARTICIPANT_UPDATE',
    'REGISTRATION_VIEW',
    'REGISTRATION_MANAGE',
    'PAYMENT_VIEW',
    'COUPON_MANAGE',
    'CERTIFICATE_ISSUE',
    'REPORT_VIEW',
    'COMMUNICATION_MANAGE',
  ],
  FINANCEIRO: [
    'EVENT_UPDATE',
    'PARTICIPANT_VIEW',
    'REGISTRATION_VIEW',
    'REGISTRATION_MANAGE',
    'PAYMENT_VIEW',
    'PAYMENT_MANAGE',
    'PAYMENT_REFUND',
    'REPORT_VIEW',
    'COUPON_MANAGE',
  ],
  ATENDIMENTO: [
    'EVENT_UPDATE',
    'PARTICIPANT_VIEW',
    'PARTICIPANT_UPDATE',
    'REGISTRATION_VIEW',
    'REGISTRATION_MANAGE',
    'PAYMENT_VIEW',
    'REPORT_VIEW',
    'COMMUNICATION_MANAGE',
  ],
  CHECKIN: ['REGISTRATION_VIEW', 'CHECKIN_PERFORM', 'PARTICIPANT_VIEW'],
  CONSULTA: ['PARTICIPANT_VIEW', 'REGISTRATION_VIEW', 'PAYMENT_VIEW', 'REPORT_VIEW'],
};
