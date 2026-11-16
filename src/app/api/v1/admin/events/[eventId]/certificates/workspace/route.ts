import { NextRequest, NextResponse } from "next/server";
import {
  GetEventCertificateWorkspaceController,
  SaveEventCertificateWorkspaceController,
} from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventIdParams = { eventId: string };
type EventContext = { params: Promise<EventIdParams> };

export async function GET(
  request: NextRequest,
  context: EventContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    const container = createTicketingContainer();
    return await new GetEventCertificateWorkspaceController({
      useCase: container.getEventCertificateWorkspace,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: EventContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    const container = createTicketingContainer();
    return await new SaveEventCertificateWorkspaceController({
      useCase: container.saveEventCertificateWorkspace,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: EventContext,
): Promise<NextResponse> {
  return PATCH(request, context);
}
