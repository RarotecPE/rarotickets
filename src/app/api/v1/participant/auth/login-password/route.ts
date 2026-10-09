import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";
import { setParticipantSessionCookie } from "@/server/auth/participant-session-cookie.util";

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
      return resultFailureResponse({ error: result.error, status: 401 });
    }

    const response = jsonSuccess({
      participant: result.value.participant,
    });

    setParticipantSessionCookie(response, result.value.sessionToken);

    return response;
  } catch (error) {
    return internalErrorResponse(error);
  }
}

