import { jsonSuccess } from "@/server/api/http-response.util";
import { clearParticipantSessionCookie } from "@/server/auth/participant-session-cookie.util";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = jsonSuccess({
    success: true,
  });

  clearParticipantSessionCookie(response);

  return response;
}
