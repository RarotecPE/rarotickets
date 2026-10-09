import { NextRequest, NextResponse } from "next/server";
import { ProcessPaymentWebhookController } from "@/modules/ticketing/server/api/controllers/process-payment-webhook.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const container = createTicketingContainer();
    return await new ProcessPaymentWebhookController({ useCase: container.processPaymentWebhook, gateway: container.paymentGateway }).handle({ request, provider: "pagbank" });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
