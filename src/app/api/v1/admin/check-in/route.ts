import { NextRequest, NextResponse } from "next/server";
import { CheckInController } from "@/modules/ticketing/server/api/controllers/check-in.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new CheckInController({ useCase: createTicketingContainer().checkIn }).handle({ request });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
