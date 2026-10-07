import type { UserRole } from "@/lib/domain/types";

export type SessionUser = {
  id: string;
  globalId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  label: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user?: SessionUser;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: "Administrador",
  GERENTE_EVENTO: "Gerente de Evento",
  FINANCEIRO: "Financeiro",
  ATENDIMENTO: "Atendimento",
  CHECKIN: "Credenciamento",
  CONSULTA: "Consulta",
};

/**
 * Mapeamento de permissões por papel.
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMINISTRADOR: ["*"],
  GERENTE_EVENTO: [
    "event.create",
    "event.edit",
    "event.publish",
    "event.cancel",
    "lot.manage",
    "registration.view",
    "registration.cancel",
    "coupon.manage",
    "report.view",
  ],
  FINANCEIRO: [
    "payment.view",
    "payment.refund",
    "payment.reconcile",
    "report.financial",
    "registration.view",
  ],
  ATENDIMENTO: [
    "registration.view",
    "registration.confirm_free",
    "coupon.apply_courtesy",
    "participant.view",
  ],
  CHECKIN: ["checkin.perform", "registration.view.basic"],
  CONSULTA: ["report.view", "event.view", "registration.view"],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}
