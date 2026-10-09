import { NextRequest, NextResponse } from "next/server";
import { CreateEventController } from "@/modules/ticketing/server/api/controllers/create-event.controller";
import { ListManagedEventsController } from "@/modules/ticketing/server/api/controllers/list-managed-events.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await new ListManagedEventsController({ useCase: createTicketingContainer().listManagedEvents }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new CreateEventController({ useCase: createTicketingContainer().createEvent }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
