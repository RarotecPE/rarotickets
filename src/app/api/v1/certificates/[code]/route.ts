import { NextRequest, NextResponse } from "next/server";
import { ValidateCertificateController } from "@/modules/ticketing/server/api/controllers/validate-certificate.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type CertificateCodeParams = { code: string };
type CertificateContext = { params: Promise<CertificateCodeParams> };

export async function GET(_request: NextRequest, context: CertificateContext): Promise<NextResponse> {
  try {
    const { code } = await context.params;
    return await new ValidateCertificateController({ useCase: createTicketingContainer().validateCertificate }).handle({ code });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
