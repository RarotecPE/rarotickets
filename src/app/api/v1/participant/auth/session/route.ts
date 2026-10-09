import { NextRequest } from "next/server";
import { jsonSuccess } from "@/server/api/http-response.util";
import { getParticipantSessionFromRequest } from "@/server/auth/participant-session-cookie.util";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getParticipantSessionFromRequest(request);

  if (!session) {
    return jsonSuccess({
      authenticated: false,
      participant: null,
    });
  }

  return jsonSuccess({
    authenticated: true,
    participant: {
      id: session.participantId,
      name: session.name,
      email: session.email,
      cpf: session.cpf,
      phone: session.phone,
    },
  });
}

