import { NextRequest, NextResponse } from "next/server";
import { SimulatePaymentController } from "@/modules/ticketing/server/api/controllers/simulate-payment.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new SimulatePaymentController({ useCase: createTicketingContainer().processPaymentWebhook }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
