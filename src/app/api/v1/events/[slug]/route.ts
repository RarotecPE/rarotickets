import { NextRequest, NextResponse } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import { GetPublicEventController } from "@/modules/ticketing/server/api/controllers/get-public-event.controller";

export const dynamic = "force-dynamic";

type EventSlugParams = { slug: string };
type EventRouteContext = { params: Promise<EventSlugParams> };

export async function GET(_request: NextRequest, context: EventRouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const controller = new GetPublicEventController({ useCase: createTicketingContainer().getPublicEvent });
  return controller.handle({ slug });
}
