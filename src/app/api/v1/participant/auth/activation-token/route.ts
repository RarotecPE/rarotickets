import { NextRequest } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import {
  jsonSuccess,
  resultFailureResponse,
  internalErrorResponse,
} from "@/server/api/http-response.util";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.nextUrl.searchParams.get("token") || "";

    const container = createTicketingContainer();
    const result = await container.getActivationTokenInfo.execute({
      rawToken,
    });

    if (result.isFailure) {
      return resultFailureResponse({ error: result.error, status: 400 });
    }

    return jsonSuccess(result.value);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

