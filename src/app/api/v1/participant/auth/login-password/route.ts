import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";
import { setParticipantSessionCookie } from "@/server/auth/participant-session-cookie.util";
import { auditClient, getRequestContext } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      identifier?: string;
      password?: string;
    };

    const container = createTicketingContainer();
    const result = await container.participantLoginWithPassword.execute({
      identifier: body.identifier || "",
      password: body.password || "",
    });

    if (result.isFailure) {
      const context = getRequestContext(request);
      auditClient.log({
        category: "auth",
        action: "participant.login_failed",
        severity: "WARNING",
        actor: { type: "anonymous" },
        context,
        targets: [{ type: "system", id: "rarotickets", label: "RaroTickets" }],
        details: { method: "password", identifier: body.identifier || null },
      });
      return resultFailureResponse({ error: result.error, status: 401 });
    }

    const context = getRequestContext(request);
    auditClient.log({
      category: "auth",
      action: "participant.logged_in",
      severity: "INFO",
      actor: {
        type: "user",
        userId: result.value.participant.id,
        name: result.value.participant.name,
        email: result.value.participant.email,
        role: "participante",
      },
      context,
      targets: [
        { type: "participant", id: result.value.participant.id, label: result.value.participant.name },
      ],
      details: { method: "password" },
    });

    const response = jsonSuccess({
      participant: result.value.participant,
    });

    setParticipantSessionCookie(response, result.value.sessionToken);

    return response;
  } catch (error) {
    return internalErrorResponse(error);
  }
}

