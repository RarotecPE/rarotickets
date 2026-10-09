import { NextRequest, NextResponse } from "next/server";
import { LogoutController } from "@/modules/access/server/api/controllers/logout.controller";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest): Promise<NextResponse> {
  return new LogoutController().handle(request);
}
