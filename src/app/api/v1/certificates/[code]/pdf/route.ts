import { NextRequest, NextResponse } from "next/server";
import { RenderCertificatePdfController } from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type CodeParams = { code: string };
type CodeContext = { params: Promise<CodeParams> };

export async function GET(
  request: NextRequest,
  context: CodeContext,
): Promise<NextResponse> {
  try {
    const { code } = await context.params;
    const container = createTicketingContainer();
    return await new RenderCertificatePdfController({
      useCase: container.renderCertificatePdf,
    }).handle({ request, code });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
