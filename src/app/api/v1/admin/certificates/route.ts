import { NextRequest, NextResponse } from "next/server";
import { ListCertificateEventsController } from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const container = createTicketingContainer();
    return await new ListCertificateEventsController({
      useCase: container.listCertificateEvents,
    }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
