import { NextRequest, NextResponse } from "next/server";
import { ListRegistrationsController } from "@/modules/ticketing/server/api/controllers/list-registrations.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await new ListRegistrationsController({ useCase: createTicketingContainer().listRegistrations }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
