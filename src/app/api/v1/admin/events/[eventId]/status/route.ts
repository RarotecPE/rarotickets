import { NextRequest, NextResponse } from "next/server";
import { TransitionEventController } from "@/modules/ticketing/server/api/controllers/transition-event.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventIdParams = { eventId: string };
type EventStatusContext = { params: Promise<EventIdParams> };

export async function PATCH(request: NextRequest, context: EventStatusContext): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    return await new TransitionEventController({ useCase: createTicketingContainer().transitionEvent }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
