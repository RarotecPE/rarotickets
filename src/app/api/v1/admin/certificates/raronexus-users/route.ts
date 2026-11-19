import { NextRequest, NextResponse } from "next/server";
import { internalErrorResponse, jsonError, jsonSuccess } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { createRaroNexusClient } from "@/server/auth/raronexus.client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guard = await requirePermission({
    request,
    permission: "certificates:write",
  });
  if (!guard.ok) return guard.response;

  try {
    const users = await createRaroNexusClient().listDirectoryUsers();
    return jsonSuccess({ users });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError({
        code: "RARONEXUS_USERS_UNAVAILABLE",
        message: error.message,
        status: 502,
      });
    }
    return internalErrorResponse(error);
  }
}
