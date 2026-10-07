import "server-only";
import type { NextRequest } from "next/server";
import { Result } from "@/@core/domain/result";
import type { Permission } from "@/modules/access/domain/services/role-permissions.domain-service";
import { AuthFailure } from "./auth.errors";
import type { AuthSession } from "./auth.types";
import { RAROTICKETS_SESSION_COOKIE, createRaroNexusClient } from "./raronexus.client";

export type RequirePermissionParams = { request: NextRequest; permission: Permission };
export type SessionResult = Result<AuthSession, AuthFailure>;

export async function getSession(request: NextRequest): Promise<SessionResult> {
  const token = request.cookies.get(RAROTICKETS_SESSION_COOKIE)?.value;
  if (!token) {
    return Result.fail(new AuthFailure({ kind: "unauthenticated", code: "SESSION_REQUIRED", message: "Entre com sua conta RaroNexus para continuar.", httpStatus: 401 }));
  }
  try {
    return Result.ok(await createRaroNexusClient().introspect({ token }));
  } catch (error) {
    if (error instanceof AuthFailure) return Result.fail(error);
    return Result.fail(new AuthFailure({ kind: "unavailable", code: "SSO_UNAVAILABLE", message: "Não foi possível validar a sessão com RaroNexus.", httpStatus: 503 }));
  }
}

export async function requirePermission(params: RequirePermissionParams): Promise<SessionResult> {
  const result = await getSession(params.request);
  if (result.isFailure) return result;
  if (!result.value.permissions.includes(params.permission)) {
    return Result.fail(new AuthFailure({ kind: "forbidden", code: "PERMISSION_DENIED", message: "Seu perfil não permite executar esta ação.", httpStatus: 403 }));
  }
  return result;
}
