import { NextRequest, NextResponse } from "next/server";
import { UploadEventPixQrController } from "@/modules/ticketing/server/api/controllers/upload-event-pix-qr.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new UploadEventPixQrController({
      useCase: createTicketingContainer().uploadEventPixQr,
    }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

