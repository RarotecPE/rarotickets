import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      identifier?: string;
    };

    const container = createTicketingContainer();
    const result = await container.requestParticipantOtp.execute({
      identifier: body.identifier || "",
    });

    if (result.isFailure) {
      return resultFailureResponse({ error: result.error, status: 400 });
    }

    return jsonSuccess(result.value);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

