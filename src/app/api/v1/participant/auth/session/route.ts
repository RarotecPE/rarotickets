import { NextRequest } from "next/server";
import { jsonSuccess } from "@/server/api/http-response.util";
import { getParticipantSessionFromRequest } from "@/server/auth/participant-session-cookie.util";
import { createTicketingContainer } from "@/server/di/container";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getParticipantSessionFromRequest(request);

  if (!session) {
    return jsonSuccess({
      authenticated: false,
      participant: null,
    });
  }

  const container = createTicketingContainer();
  const fullParticipant = await container.participantAuthRepository
    .findById(session.participantId)
    .catch(() => null);

  return jsonSuccess({
    authenticated: true,
    participant: {
      id: session.participantId,
      name: fullParticipant?.name ?? session.name,
      email: fullParticipant?.email ?? session.email,
      cpf: fullParticipant?.cpf ?? session.cpf,
      phone: fullParticipant?.phone ?? session.phone,
      birthDate: fullParticipant?.birthDate
        ? fullParticipant.birthDate.toISOString().slice(0, 10)
        : null,
      company: fullParticipant?.company ?? null,
      jobTitle: fullParticipant?.jobTitle ?? null,
    },
  });
}

