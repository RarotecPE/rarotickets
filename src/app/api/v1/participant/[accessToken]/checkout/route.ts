import { NextRequest, NextResponse } from "next/server";
import { StartParticipantCheckoutController } from "@/modules/ticketing/server/api/controllers/start-participant-checkout.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type AccessTokenParams = { accessToken: string };
type CheckoutContext = { params: Promise<AccessTokenParams> };

export async function POST(_request: NextRequest, context: CheckoutContext): Promise<NextResponse> {
  try {
    const { accessToken } = await context.params;
    return await new StartParticipantCheckoutController({ useCase: createTicketingContainer().startParticipantCheckout }).handle({ accessToken });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
