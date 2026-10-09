import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  jsonError,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";
import { getParticipantSessionFromRequest } from "@/server/auth/participant-session-cookie.util";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = getParticipantSessionFromRequest(request);
    if (!session) {
      return jsonError({
        code: "UNAUTHENTICATED",
        message: "Faça login para acessar seus eventos.",
        status: 401,
      });
    }

    const container = createTicketingContainer();
    const result = await container.getParticipantEvents.execute({
      participantId: session.participantId,
    });

    if (result.isFailure) {
      return resultFailureResponse({ error: result.error });
    }

    return jsonSuccess(result.value);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

