import { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { AuthFailure } from "@/server/auth/auth.errors";
import { clearTemporarySsoCookies, setSessionCookie } from "@/server/auth/auth-session-cookie.util";
import { createRaroNexusClient, RAROTICKETS_SSO_NEXT_COOKIE, RAROTICKETS_SSO_STATE_COOKIE } from "@/server/auth/raronexus.client";
import { stateMatches, validateInternalPath } from "@/server/auth/sso-url.util";
import { readEnvironment } from "@/server/config/environment.config";
import { auditClient, getRequestContext } from "@/lib/audit";

type RedirectToLoginParams = { baseUrl: string; reason: string };

export class CompleteRaroNexusSsoController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const environment = readEnvironment();
    const callbackState = request.nextUrl.searchParams.get("state");
    const savedState = request.cookies.get(RAROTICKETS_SSO_STATE_COOKIE)?.value;
    const savedNextPath = request.cookies.get(RAROTICKETS_SSO_NEXT_COOKIE)?.value ?? "/painel";
    const nextPath = validateInternalPath(savedNextPath);
    if (!stateMatches(savedState, callbackState)) return this.redirectToLogin({ baseUrl: environment.appBaseUrl, reason: "sso_state_invalid" });
    const callbackError = request.nextUrl.searchParams.get("error");
    const code = request.nextUrl.searchParams.get("code");
    if (callbackError || !code) return this.redirectToLogin({ baseUrl: environment.appBaseUrl, reason: callbackError === "login_required" ? "login_required" : "sso_cancelled" });
    try {
      const redirectUri = `${environment.appBaseUrl}/api/auth/raronexus/callback`;
      const exchange = await createRaroNexusClient().exchangeCode({ code, redirectUri });
      const response = NextResponse.redirect(new URL(nextPath, environment.appBaseUrl));
      setSessionCookie(response, { token: exchange.token });
      clearTemporarySsoCookies(response);

      const context = getRequestContext(request);
      auditClient.log({
        category: "auth",
        action: "auth.sso_login_completed",
        severity: "INFO",
        actor: {
          type: "user",
          userId: exchange.user.id,
          name: exchange.user.nome,
          email: exchange.user.email,
          role: exchange.role.chave,
        },
        context,
        targets: [{ type: "user", id: exchange.user.id, label: exchange.user.nome }],
        details: {
          role: exchange.role.chave,
          role_name: exchange.role.nome,
        },
      });

      return response;
    } catch (error) {
      const reason = error instanceof AuthFailure && error.code === "UNKNOWN_ROLE" ? "role_not_allowed" : "sso_unavailable";
      if (reason === "role_not_allowed") {
        const context = getRequestContext(request);
        auditClient.log({
          category: "auth",
          action: "auth.sso_access_denied",
          severity: "WARNING",
          actor: { type: "anonymous" },
          context,
          targets: [{ type: "system", id: "rarotickets", label: "RaroTickets" }],
          details: { reason: "role_not_allowed" },
        });
      }
      return this.redirectToLogin({ baseUrl: environment.appBaseUrl, reason });
    }
  }
  private redirectToLogin(params: RedirectToLoginParams): NextResponse {
    const loginUrl = new URL("/login", params.baseUrl);
    loginUrl.searchParams.set("reason", params.reason);
    const response = NextResponse.redirect(loginUrl);
    clearTemporarySsoCookies(response);
    return response;
  }
}
