import { NextRequest, NextResponse } from "next/server";
import { CompleteRaroNexusSsoController } from "@/modules/access/server/api/controllers/complete-raronexus-sso.controller";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<NextResponse> {
  return new CompleteRaroNexusSsoController().handle(request);
}
