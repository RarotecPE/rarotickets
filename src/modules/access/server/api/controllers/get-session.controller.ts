import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { authErrorResponse, jsonSuccess } from "@/server/api/http-response.util";
import { getSession } from "@/server/auth/session.service";

export class GetSessionController extends Controller<NextRequest, NextResponse> {
  constructor() { super(); }
  async handle(request: NextRequest): Promise<NextResponse> {
    const result = await getSession(request);
    if (result.isFailure) return authErrorResponse(result.error);
    return jsonSuccess({ authenticated: true, role: result.value.role, label: result.value.label, user: result.value.user, permissions: result.value.permissions });
  }
}
