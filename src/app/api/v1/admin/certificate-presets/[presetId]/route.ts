import { NextRequest, NextResponse } from "next/server";
import { DeleteCertificatePresetController } from "@/modules/ticketing/server/api/controllers/certificates-studio.controller";
import { internalErrorResponse } from "@/server/api/http-response.util";
import { createTicketingContainer } from "@/server/di/container";

type PresetIdParams = { presetId: string };
type PresetContext = { params: Promise<PresetIdParams> };

export async function DELETE(
  request: NextRequest,
  context: PresetContext,
): Promise<NextResponse> {
  try {
    const { presetId } = await context.params;
    const container = createTicketingContainer();
    return await new DeleteCertificatePresetController({
      useCase: container.deleteCertificatePreset,
    }).handle({ request, presetId });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
