import { NextRequest, NextResponse } from "next/server";
import { ExtendRegistrationReservationController } from "@/modules/ticketing/server/api/controllers/extend-registration-reservation.controller";
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
    return await new ExtendRegistrationReservationController({
      useCase: createTicketingContainer().extendRegistrationReservation,
    }).handle({ request, registrationId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

