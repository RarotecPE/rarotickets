import { NextRequest, NextResponse } from "next/server";
import { GetSessionController } from "@/modules/access/server/api/controllers/get-session.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return new GetSessionController().handle(request);
}
