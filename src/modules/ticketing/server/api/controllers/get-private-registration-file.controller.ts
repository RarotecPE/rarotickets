import { NextResponse, type NextRequest } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { GetPrivateRegistrationFileUseCase } from "@/modules/ticketing/application/use-cases/get-private-registration-file/get-private-registration-file.use-case";

export type GetPrivateRegistrationFileRequest = { request: NextRequest; fileId: string };
export type GetPrivateRegistrationFileDependencies = { useCase: GetPrivateRegistrationFileUseCase };

export class GetPrivateRegistrationFileController extends Controller<GetPrivateRegistrationFileRequest, NextResponse> {
  private readonly useCase: GetPrivateRegistrationFileUseCase;

  constructor(dependencies: GetPrivateRegistrationFileDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: GetPrivateRegistrationFileRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "registrations:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ fileId: input.fileId, userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 404 });
      const body = new Uint8Array(result.value.content).buffer;
      return new NextResponse(body, { status: 200, headers: {
        "Content-Type": result.value.mimeType,
        "Content-Length": String(result.value.sizeBytes),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.value.originalName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      } });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
