import { NextRequest, NextResponse } from "next/server";
import { StartRaroNexusSsoController } from "@/modules/access/server/api/controllers/start-raronexus-sso.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return new StartRaroNexusSsoController().handle(request);
}
