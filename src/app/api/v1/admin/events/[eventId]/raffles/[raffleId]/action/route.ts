import { NextRequest, NextResponse } from "next/server";
import { ControlEventRaffleController } from "@/modules/ticketing/server/api/controllers/raffles.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type RaffleParams = { eventId: string; raffleId: string };
type RouteContext = { params: Promise<RaffleParams> };

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { eventId, raffleId } = await context.params;
    return await new ControlEventRaffleController({
      useCase: createTicketingContainer().controlEventRaffle,
    }).handle({ request, eventId, raffleId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
