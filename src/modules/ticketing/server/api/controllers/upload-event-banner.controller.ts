import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { UploadEventBannerUseCase } from "@/modules/ticketing/application/use-cases/upload-event-banner/upload-event-banner.use-case";
import { auditClient, getRequestContext, sessionToAuditActor } from "@/lib/audit";

export type UploadEventBannerDependencies = { useCase: UploadEventBannerUseCase };

export class UploadEventBannerController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: UploadEventBannerUseCase;

  constructor(dependencies: UploadEventBannerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "events:write" });
    if (!guard.ok) return guard.response;
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") return jsonError({ code: "BANNER_REQUIRED", message: "Selecione uma imagem PNG ou JPG para o banner.", status: 400 });
      const result = await this.useCase.execute({ mimeType: file.type, sizeBytes: file.size, content: new Uint8Array(await file.arrayBuffer()) });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      const context = getRequestContext(request);
      const actor = sessionToAuditActor(guard.session);
      auditClient.log({
        category: "event",
        action: "event.banner_uploaded",
        severity: "INFO",
        actor,
        context,
        targets: [{ type: "file", id: result.value.bannerUrl, label: file.name || "banner" }],
        details: {
          banner_url: result.value.bannerUrl,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
