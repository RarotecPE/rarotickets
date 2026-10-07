import { NextRequest, NextResponse } from "next/server";
import { GetManagedEventController } from "@/modules/ticketing/server/api/controllers/get-managed-event.controller";
import { UpdateEventController } from "@/modules/ticketing/server/api/controllers/update-event.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventIdParams = { eventId: string };
type EventAdminContext = { params: Promise<EventIdParams> };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: EventAdminContext): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    return await new GetManagedEventController({ useCase: createTicketingContainer().getManagedEvent }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: EventAdminContext): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    return await new UpdateEventController({ useCase: createTicketingContainer().updateEvent }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
