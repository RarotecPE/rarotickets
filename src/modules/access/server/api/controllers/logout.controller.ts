import { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { clearSessionCookie } from "@/server/auth/auth-session-cookie.util";
import { createRaroNexusClient, RAROTICKETS_SESSION_COOKIE } from "@/server/auth/raronexus.client";

type RevokeSessionParams = { token: string };

export class LogoutController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const token = request.cookies.get(RAROTICKETS_SESSION_COOKIE)?.value;
    const globalRevocationConfirmed = token ? await this.revokeRemoteSession({ token }) : false;
    const response = NextResponse.json({ data: { localSessionCleared: true, globalRevocationConfirmed } }, { headers: { "Cache-Control": "no-store" } });
    clearSessionCookie(response);
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
