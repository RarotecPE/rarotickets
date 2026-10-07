import { NextResponse } from "next/server";
import { getSession } from "@/server/session/session.service";
import { hasPermission, type SessionUser } from "@/lib/auth-types";

export type ApiHandler = (ctx: { user: SessionUser; req: Request }) => Promise<Response> | Response;

export function withAuth(handler: ApiHandler, requiredPermission?: string) {
  return async (req: Request): Promise<Response> => {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autenticado" } }, { status: 401 });
    }
    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Sem permissão" } }, { status: 403 });
    }
    return handler({ user, req });
  };
}
