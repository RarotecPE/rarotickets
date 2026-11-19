import { NextRequest, NextResponse } from "next/server";
import {
  DeleteCertificateAttachmentController,
  UploadCertificateAttachmentController,
} from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventIdParams = { eventId: string };
type EventContext = { params: Promise<EventIdParams> };

export async function POST(
  request: NextRequest,
  context: EventContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    const container = createTicketingContainer();
    return await new UploadCertificateAttachmentController({
      useCase: container.uploadCertificateAttachment,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: EventContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    const container = createTicketingContainer();
    return await new DeleteCertificateAttachmentController({
      useCase: container.deleteCertificateAttachment,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
