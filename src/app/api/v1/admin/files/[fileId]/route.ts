import { NextRequest, NextResponse } from "next/server";
import { GetPrivateRegistrationFileController } from "@/modules/ticketing/server/api/controllers/get-private-registration-file.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type FileRouteParams = { fileId: string };
type FileRouteContext = { params: Promise<FileRouteParams> };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: FileRouteContext): Promise<NextResponse> {
  try {
    const { fileId } = await context.params;
    return await new GetPrivateRegistrationFileController({ useCase: createTicketingContainer().getPrivateRegistrationFile }).handle({ request, fileId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
