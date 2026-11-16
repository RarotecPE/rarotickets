import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { authErrorResponse, jsonSuccess } from "@/server/api/http-response.util";
import { clearSessionCookie } from "@/server/auth/auth-session-cookie.util";
import { getSession } from "@/server/auth/session.service";

export class GetSessionController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const result = await getSession(request);
    if (result.isFailure) {
      const response = authErrorResponse(result.error);
      if (result.error.httpStatus === 401) {
        clearSessionCookie(response);
      }
      return response;
    }
    return jsonSuccess({ authenticated: true, role: result.value.role, label: result.value.label, user: result.value.user, permissions: result.value.permissions });
  }
}
