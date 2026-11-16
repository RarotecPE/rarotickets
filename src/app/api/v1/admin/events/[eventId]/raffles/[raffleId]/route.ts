import { NextRequest, NextResponse } from "next/server";
import {
  DeleteEventRaffleController,
  GetEventRaffleController,
  UpdateEventRaffleController,
} from "@/modules/ticketing/server/api/controllers/raffles.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type RaffleParams = { eventId: string; raffleId: string };
type RouteContext = { params: Promise<RaffleParams> };

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId, raffleId } = await context.params;
    return await new GetEventRaffleController({
      useCase: createTicketingContainer().getEventRaffle,
    }).handle({ request, eventId, raffleId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId, raffleId } = await context.params;
    return await new UpdateEventRaffleController({
      useCase: createTicketingContainer().updateEventRaffle,
    }).handle({ request, eventId, raffleId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId, raffleId } = await context.params;
    return await new DeleteEventRaffleController({
      useCase: createTicketingContainer().deleteEventRaffle,
    }).handle({ request, eventId, raffleId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
