import { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { createSsoState, buildAuthorizationUrl } from "@/server/auth/sso-url.util";
import { setTemporarySsoCookies } from "@/server/auth/auth-session-cookie.util";
import { readEnvironment } from "@/server/config/environment.config";

export class StartRaroNexusSsoController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const environment = readEnvironment();
    const nextPath = request.nextUrl.searchParams.get("next") ?? "/painel";
    const state = createSsoState({ nextPath });
    const silent = request.nextUrl.searchParams.get("mode") !== "interactive";
    try {
      const redirectUri = `${environment.appBaseUrl}/api/auth/raronexus/callback`;
      const authorizationUrl = buildAuthorizationUrl({ state: state.state, redirectUri, silent });
      const response = NextResponse.redirect(authorizationUrl);
      setTemporarySsoCookies(response, { state: state.state, nextPath: state.nextPath });
      return response;
    } catch {
      return NextResponse.redirect(new URL("/login?reason=sso_not_configured", environment.appBaseUrl));
    }
  }
}
