import { NextRequest, NextResponse } from "next/server";
import { GetPublicFileController } from "@/modules/ticketing/server/api/controllers/get-public-file.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type PublicFileParams = { key: string[] };
type PublicFileContext = { params: Promise<PublicFileParams> };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: PublicFileContext): Promise<NextResponse> {
  try {
    const { key } = await context.params;
    return await new GetPublicFileController({ useCase: createTicketingContainer().getPublicFile }).handle({ request, key: key.join("/") });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
