import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { authErrorResponse, internalErrorResponse, jsonError, jsonSuccess } from "@/server/api/http-response.util";
import { getSession } from "@/server/auth/session.service";
import { loadApplications } from "@/server/auth/raronexus-applications.service";
import { RAROTICKETS_SESSION_COOKIE } from "@/server/auth/raronexus.client";

export class GetApplicationsController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const session = await getSession(request);
    if (session.isFailure) return authErrorResponse(session.error);
    const token = request.cookies.get(RAROTICKETS_SESSION_COOKIE)?.value;
    if (!token) return jsonError({ code: "SESSION_REQUIRED", message: "Entre com sua conta RaroNexus para continuar.", status: 401 });
    try {
      return jsonSuccess(await loadApplications({ token }));
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
