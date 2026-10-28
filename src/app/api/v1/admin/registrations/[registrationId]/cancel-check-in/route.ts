import { NextRequest, NextResponse } from "next/server";
import { CancelCheckInController } from "@/modules/ticketing/server/api/controllers/cancel-check-in.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type RegistrationParams = { registrationId: string };
type RegistrationContext = { params: Promise<RegistrationParams> };

export async function POST(
  request: NextRequest,
  context: RegistrationContext,
): Promise<NextResponse> {
  try {
    const { registrationId } = await context.params;
    return await new CancelCheckInController({
      useCase: createTicketingContainer().cancelCheckIn,
    }).handle({ request, registrationId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

