import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";
import type { AppRole } from "./role-permissions.domain-service";

export type AccessScopeParams = { role: AppRole };
export type AccessScope = { canViewAllEvents: boolean; canManageAllRegistrations: boolean; canReenter: boolean };

export class AccessScopeDomainService extends DomainService<AccessScopeParams, AccessScope> {
  execute(params: AccessScopeParams): Result<AccessScope> {
    const canViewAllEvents = params.role !== "gerente_evento";
    const canManageAllRegistrations = params.role === "administrador" || params.role === "atendimento";
    const canReenter = params.role === "administrador" || params.role === "gerente_evento";
    return Result.ok({ canViewAllEvents, canManageAllRegistrations, canReenter });
  }
}
