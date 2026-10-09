import { NextRequest, NextResponse } from "next/server";
import { RunMaintenanceController } from "@/modules/ticketing/server/api/controllers/run-maintenance.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await new RunMaintenanceController({
      useCaseFactory: () => createTicketingContainer().runMaintenance,
    }).handle(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
