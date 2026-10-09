import { NextRequest, NextResponse } from "next/server";
import { GetParticipantPortalController } from "@/modules/ticketing/server/api/controllers/get-participant-portal.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type AccessTokenParams = { accessToken: string };
type ParticipantPortalContext = { params: Promise<AccessTokenParams> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: ParticipantPortalContext): Promise<NextResponse> {
  try {
    const { accessToken } = await context.params;
    return await new GetParticipantPortalController({ useCase: createTicketingContainer().getParticipantPortal }).handle({ accessToken });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
