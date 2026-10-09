import { NextRequest, NextResponse } from "next/server";
import { GetApplicationsController } from "@/modules/access/server/api/controllers/get-applications.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return new GetApplicationsController().handle(request);
}
