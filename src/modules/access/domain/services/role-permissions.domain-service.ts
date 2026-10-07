import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export type AppRole = "administrador" | "gerente_evento" | "financeiro" | "atendimento" | "checkin" | "consulta";
export type Permission = "dashboard:read" | "events:read" | "events:write" | "registrations:read" | "registrations:manage" | "registrations:cancel" | "registrations:courtesy" | "coupons:write" | "finance:read" | "finance:refund" | "checkin:write" | "checkin:reentry" | "certificates:write" | "reports:read" | "participants:read" | "audit:read";
export type RoleKeyConfiguration = Partial<Record<AppRole, string>>;
export type ResolveRoleParams = { externalRoleKey: string; configuredRoles: RoleKeyConfiguration };
export type RoleResolution = { role: AppRole; label: string; permissions: Permission[] };

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  administrador: ["dashboard:read", "events:read", "events:write", "registrations:read", "registrations:manage", "registrations:cancel", "registrations:courtesy", "coupons:write", "finance:read", "finance:refund", "checkin:write", "checkin:reentry", "certificates:write", "reports:read", "participants:read", "audit:read"],
  gerente_evento: ["dashboard:read", "events:read", "events:write", "registrations:read", "registrations:manage", "registrations:cancel", "registrations:courtesy", "coupons:write", "checkin:write", "checkin:reentry", "certificates:write", "reports:read", "participants:read"],
  financeiro: ["dashboard:read", "events:read", "registrations:read", "finance:read", "finance:refund", "reports:read"],
  atendimento: ["registrations:read", "registrations:manage", "registrations:courtesy", "participants:read"],
  checkin: ["events:read", "registrations:read", "checkin:write"],
  consulta: ["dashboard:read", "events:read", "registrations:read", "reports:read", "participants:read"],
};

const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  gerente_evento: "Gerente de evento",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
  checkin: "Operador de check-in",
  consulta: "Consulta",
};

export class UnknownRoleError extends Error {
  readonly code = "UNKNOWN_ROLE";
  constructor() { super("O perfil informado pelo RaroNexus não está autorizado nesta aplicação."); }
}

export class RolePermissionsDomainService extends DomainService<ResolveRoleParams, RoleResolution> {
  execute(params: ResolveRoleParams): Result<RoleResolution, UnknownRoleError> {
    const matchedRole = (Object.keys(params.configuredRoles) as AppRole[]).find((role) => {
      const configuredKey = params.configuredRoles[role];
      return Boolean(configuredKey && configuredKey === params.externalRoleKey);
    });
    if (!matchedRole) return Result.fail(new UnknownRoleError());
    return Result.ok({ role: matchedRole, label: ROLE_LABELS[matchedRole], permissions: ROLE_PERMISSIONS[matchedRole] });
  }
}
