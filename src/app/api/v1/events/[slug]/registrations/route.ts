import { NextRequest, NextResponse } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import { CreatePublicRegistrationController } from "@/modules/ticketing/server/api/controllers/create-public-registration.controller";

type EventSlugParams = { slug: string };
type RegistrationRouteContext = { params: Promise<EventSlugParams> };

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RegistrationRouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const controller = new CreatePublicRegistrationController({ useCase: createTicketingContainer().createPublicRegistration });
  return controller.handle({ request, eventSlug: slug });
}
