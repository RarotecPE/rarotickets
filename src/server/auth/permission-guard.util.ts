import type { NextRequest, NextResponse } from "next/server";
import type { Permission } from "@/modules/access/domain/services/role-permissions.domain-service";
import { AccessScopeDomainService, type AccessScope } from "@/modules/access/domain/services/access-scope.domain-service";
import { authErrorResponse, jsonError } from "@/server/api/http-response.util";
import { getSession } from "@/server/auth/session.service";
import type { AuthSession } from "@/server/auth/auth.types";

export type PermissionGuardResult = { ok: true; session: AuthSession; scope: AccessScope } | { ok: false; response: NextResponse };
export type RequirePermissionParams = { request: NextRequest; permission: Permission };

export async function requirePermission(params: RequirePermissionParams): Promise<PermissionGuardResult> {
  const sessionResult = await getSession(params.request);
  if (sessionResult.isFailure) return { ok: false, response: authErrorResponse(sessionResult.error) };
  if (!sessionResult.value.permissions.includes(params.permission)) {
    return { ok: false, response: jsonError({ code: "PERMISSION_DENIED", message: "Seu perfil não tem permissão para esta operação.", status: 403 }) };
  }
  const scopeResult = new AccessScopeDomainService().execute({ role: sessionResult.value.role });
  if (scopeResult.isFailure) return { ok: false, response: jsonError({ code: "ACCESS_POLICY_ERROR", message: scopeResult.error.message, status: 403 }) };
  return { ok: true, session: sessionResult.value, scope: scopeResult.value };
}
