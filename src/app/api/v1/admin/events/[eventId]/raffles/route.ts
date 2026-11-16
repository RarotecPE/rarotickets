import { NextRequest, NextResponse } from "next/server";
import {
  CreateEventRaffleController,
  ListEventRafflesController,
} from "@/modules/ticketing/server/api/controllers/raffles.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventParams = { eventId: string };
type RouteContext = { params: Promise<EventParams> };

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    return await new ListEventRafflesController({
      useCase: createTicketingContainer().listEventRaffles,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    return await new CreateEventRaffleController({
      useCase: createTicketingContainer().createEventRaffle,
    }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
