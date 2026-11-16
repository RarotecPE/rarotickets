import { NextRequest, NextResponse } from "next/server";
import { GetPublicRaffleController } from "@/modules/ticketing/server/api/controllers/raffles.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type TokenParams = { token: string };
type RouteContext = { params: Promise<TokenParams> };

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { token } = await context.params;
    return await new GetPublicRaffleController({
      useCase: createTicketingContainer().getPublicRaffle,
    }).handle({ request, token });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
