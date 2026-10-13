import { NextRequest, NextResponse } from "next/server";
import { ConfirmManualPaymentController } from "@/modules/ticketing/server/api/controllers/confirm-manual-payment.controller";
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
    return await new ConfirmManualPaymentController({
      useCase: createTicketingContainer().confirmManualPayment,
    }).handle({ request, registrationId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

