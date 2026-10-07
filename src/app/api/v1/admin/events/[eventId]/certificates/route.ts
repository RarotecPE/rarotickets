import { NextRequest, NextResponse } from "next/server";
import { IssueCertificatesController } from "@/modules/ticketing/server/api/controllers/issue-certificates.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type EventIdParams = { eventId: string };
type EventCertificatesContext = { params: Promise<EventIdParams> };

export async function POST(request: NextRequest, context: EventCertificatesContext): Promise<NextResponse> {
  try {
    const { eventId } = await context.params;
    const container = createTicketingContainer();
    return await new IssueCertificatesController({ getManagedEvent: container.getManagedEvent, issueCertificates: container.issueCertificates }).handle({ request, eventId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
