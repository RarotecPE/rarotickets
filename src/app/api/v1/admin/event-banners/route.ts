import { NextRequest, NextResponse } from "next/server";
import { UploadEventBannerController } from "@/modules/ticketing/server/api/controllers/upload-event-banner.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new UploadEventBannerController({ useCase: createTicketingContainer().uploadEventBanner }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
