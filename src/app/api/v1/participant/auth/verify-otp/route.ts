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
      code?: string;
    };

    const container = createTicketingContainer();
    const result = await container.verifyParticipantOtp.execute({
      identifier: body.identifier || "",
      code: body.code || "",
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

