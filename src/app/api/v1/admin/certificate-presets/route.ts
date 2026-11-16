import { NextRequest, NextResponse } from "next/server";
import { CreateCertificatePresetController } from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const container = createTicketingContainer();
    return await new CreateCertificatePresetController({
      useCase: container.createCertificatePreset,
    }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
