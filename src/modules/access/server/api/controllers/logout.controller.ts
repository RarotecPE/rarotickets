import { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { clearSessionCookie } from "@/server/auth/auth-session-cookie.util";
import { createRaroNexusClient, RAROTICKETS_SESSION_COOKIE } from "@/server/auth/raronexus.client";
import { getSession } from "@/server/auth/session.service";
import { auditClient, getRequestContext, sessionToAuditActor } from "@/lib/audit";

type RevokeSessionParams = { token: string };

export class LogoutController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const sessionResult = await getSession(request);
    const actor = sessionResult.isSuccess ? sessionToAuditActor(sessionResult.value) : { type: "anonymous" as const };
    const context = getRequestContext(request);

    const token = request.cookies.get(RAROTICKETS_SESSION_COOKIE)?.value;
    const globalRevocationConfirmed = token ? await this.revokeRemoteSession({ token }) : false;
    const response = NextResponse.json({ data: { localSessionCleared: true, globalRevocationConfirmed } }, { headers: { "Cache-Control": "no-store" } });
    clearSessionCookie(response);

    auditClient.log({
      category: "auth",
      action: "auth.logout",
      severity: "INFO",
      actor,
      context,
      targets: actor.userId ? [{ type: "user", id: actor.userId, label: actor.name || "Usuário" }] : [],
      details: { globalRevocationConfirmed },
    });

    return response;
  }
  private async revokeRemoteSession(params: RevokeSessionParams): Promise<boolean> {
    try {
      return await createRaroNexusClient().revoke({ token: params.token });
    } catch {
      return false;
    }
  }
}
