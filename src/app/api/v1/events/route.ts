import { NextRequest, NextResponse } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import { GetPublicEventsController } from "@/modules/ticketing/server/api/controllers/get-public-events.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  const controller = new GetPublicEventsController({ useCase: createTicketingContainer().listPublicEvents });
  return controller.handle(request);
}
