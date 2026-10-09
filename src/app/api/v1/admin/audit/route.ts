import { NextRequest, NextResponse } from "next/server";
import { ListAuditLogController } from "@/modules/ticketing/server/api/controllers/list-audit-log.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await new ListAuditLogController({ useCase: createTicketingContainer().listAuditLog }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
