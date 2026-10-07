import { NextRequest, NextResponse } from "next/server";
import { createTicketingContainer } from "@/server/di/container";
import { GetDashboardController } from "@/modules/ticketing/server/api/controllers/get-dashboard.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return new GetDashboardController({ useCase: createTicketingContainer().getDashboard }).handle(request);
}
