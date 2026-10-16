import { NextRequest } from "next/server";
import { jsonSuccess } from "@/server/api/http-response.util";
import { clearParticipantSessionCookie } from "@/server/auth/participant-session-cookie.util";
import { auditClient, getRequestContext } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  auditClient.log({
    category: "auth",
    action: "participant.logout",
    severity: "INFO",
    actor: { type: "user", role: "participante" },
    context,
    targets: [],
  });

  const response = jsonSuccess({
    success: true,
  });

  clearParticipantSessionCookie(response);

  return response;
}
