import { NextRequest, NextResponse } from "next/server";
import { GetReportController } from "@/modules/ticketing/server/api/controllers/get-report.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return await new GetReportController({ useCase: createTicketingContainer().getReport }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
