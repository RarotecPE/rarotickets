import { NextResponse, type NextRequest } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ListCertificateEventsUseCase } from "@/modules/ticketing/application/use-cases/list-certificate-events/list-certificate-events.use-case";
import { UpdateEventCertificateStatusUseCase } from "@/modules/ticketing/application/use-cases/update-event-certificate-status/update-event-certificate-status.use-case";
import { GetEventCertificateWorkspaceUseCase } from "@/modules/ticketing/application/use-cases/get-event-certificate-workspace/get-event-certificate-workspace.use-case";
import { SaveEventCertificateWorkspaceUseCase } from "@/modules/ticketing/application/use-cases/save-event-certificate-workspace/save-event-certificate-workspace.use-case";
import {
  GetCertificateTemplatePdfUseCase,
  UploadCertificateTemplateUseCase,
} from "@/modules/ticketing/application/use-cases/upload-certificate-template/upload-certificate-template.use-case";
import {
  CreateCertificatePresetUseCase,
  DeleteCertificatePresetUseCase,
} from "@/modules/ticketing/application/use-cases/manage-certificate-presets/manage-certificate-presets.use-case";
import { RenderCertificatePdfUseCase } from "@/modules/ticketing/application/use-cases/render-certificate-pdf/render-certificate-pdf.use-case";
import { SendCertificateEmailUseCase } from "@/modules/ticketing/application/use-cases/send-certificate-email/send-certificate-email.use-case";
import type {
  CertificateEmailConfig,
  CertificateLayoutConfig,
  CertificateSelectionConfig,
  CertificateWorkflowStatus,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import {
  getClientIp,
  readBoolean,
  readInteger,
  readObject,
  readOptionalText,
  readText,
} from "@/server/api/request-data.util";
import {
  internalErrorResponse,
  jsonError,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type ListCertificateEventsControllerDependencies = {
  useCase: ListCertificateEventsUseCase;
};

export class ListCertificateEventsController extends Controller<
  NextRequest,
  NextResponse
> {
  private readonly useCase: ListCertificateEventsUseCase;

  constructor(dependencies: ListCertificateEventsControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const query = request.nextUrl.searchParams.get("q") ?? undefined;
      const result = await this.useCase.execute({
        userId: guard.session.user.id,
        canViewAll: guard.scope.canViewAllEvents,
        query,
      });
      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type EventScopedControllerRequest = {
  request: NextRequest;
  eventId: string;
};

export type UpdateEventCertificateStatusControllerDependencies = {
  useCase: UpdateEventCertificateStatusUseCase;
};

export class UpdateEventCertificateStatusController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: UpdateEventCertificateStatusUseCase;

  constructor(
    dependencies: UpdateEventCertificateStatusControllerDependencies,
  ) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const workflowStatus = readText({
        value: body.workflowStatus,
        fallback: "pendente",
      }) as CertificateWorkflowStatus;

      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        workflowStatus,
        ip: getClientIp(input.request),
      });
      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type GetEventCertificateWorkspaceControllerDependencies = {
  useCase: GetEventCertificateWorkspaceUseCase;
};

export class GetEventCertificateWorkspaceController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: GetEventCertificateWorkspaceUseCase;

  constructor(
    dependencies: GetEventCertificateWorkspaceControllerDependencies,
  ) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        canViewAll: guard.scope.canViewAllEvents,
      });
      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 404 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type SaveEventCertificateWorkspaceControllerDependencies = {
  useCase: SaveEventCertificateWorkspaceUseCase;
};

export class SaveEventCertificateWorkspaceController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: SaveEventCertificateWorkspaceUseCase;

  constructor(
    dependencies: SaveEventCertificateWorkspaceControllerDependencies,
  ) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const workloadHours =
        body.workloadHours !== undefined
          ? readInteger({ value: body.workloadHours, fallback: 8 })
          : undefined;
      const certificateDescription =
        body.certificateDescription !== undefined
          ? readText({ value: body.certificateDescription })
          : undefined;
      const templatePdfKey =
        body.templatePdfKey !== undefined
          ? readOptionalText({ value: body.templatePdfKey })
          : undefined;
      const templatePdfName =
        body.templatePdfName !== undefined
          ? readOptionalText({ value: body.templatePdfName })
          : undefined;
      const workflowStatus =
        body.workflowStatus !== undefined
          ? (readText({ value: body.workflowStatus }) as CertificateWorkflowStatus)
          : undefined;

      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        workloadHours,
        certificateDescription,
        templatePdfKey,
        templatePdfName,
        layoutConfig:
          body.layoutConfig && typeof body.layoutConfig === "object"
            ? (body.layoutConfig as CertificateLayoutConfig)
            : undefined,
        emailConfig:
          body.emailConfig && typeof body.emailConfig === "object"
            ? (body.emailConfig as CertificateEmailConfig)
            : undefined,
        selectionConfig:
          body.selectionConfig && typeof body.selectionConfig === "object"
            ? (body.selectionConfig as CertificateSelectionConfig)
            : undefined,
        workflowStatus,
        issueBatch: readBoolean({ value: body.issueBatch }),
        resetEmailStatuses: readBoolean({ value: body.resetEmailStatuses }),
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type UploadCertificateTemplateControllerDependencies = {
  useCase: UploadCertificateTemplateUseCase;
};

export class UploadCertificateTemplateController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: UploadCertificateTemplateUseCase;

  constructor(dependencies: UploadCertificateTemplateControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const formData = await input.request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return jsonError({
          code: "PDF_REQUIRED",
          message: "Selecione um arquivo PDF (.pdf) para o modelo de certificado.",
          status: 400,
        });
      }

      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        mimeType: file.type || "application/pdf",
        sizeBytes: file.size,
        originalName: file.name || "modelo-certificado.pdf",
        content: new Uint8Array(await file.arrayBuffer()),
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type GetCertificateTemplatePdfControllerDependencies = {
  useCase: GetCertificateTemplatePdfUseCase;
};

export class GetCertificateTemplatePdfController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: GetCertificateTemplatePdfUseCase;

  constructor(dependencies: GetCertificateTemplatePdfControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const keyParam =
        input.request.nextUrl.searchParams.get("key") ?? undefined;
      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        canViewAll: guard.scope.canViewAllEvents,
        templatePdfKey: keyParam,
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 404 });
      }

      return new NextResponse(Buffer.from(result.value.content), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${result.value.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type SendCertificateEmailControllerDependencies = {
  useCase: SendCertificateEmailUseCase;
};

export class SendCertificateEmailController extends Controller<
  EventScopedControllerRequest,
  NextResponse
> {
  private readonly useCase: SendCertificateEmailUseCase;

  constructor(dependencies: SendCertificateEmailControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: EventScopedControllerRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await input.request.json().catch(() => null));
      const recipientKey =
        readOptionalText({ value: body.recipientKey }) ?? undefined;
      const testRecipient =
        readOptionalText({ value: body.testRecipient }) ?? undefined;

      const result = await this.useCase.execute({
        eventId: input.eventId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        recipientKey,
        testRecipient,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type CreateCertificatePresetControllerDependencies = {
  useCase: CreateCertificatePresetUseCase;
};

export class CreateCertificatePresetController extends Controller<
  NextRequest,
  NextResponse
> {
  private readonly useCase: CreateCertificatePresetUseCase;

  constructor(dependencies: CreateCertificatePresetControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = readObject(await request.json().catch(() => null));
      if (!body.layoutConfig || typeof body.layoutConfig !== "object") {
        return jsonError({
          code: "INVALID_LAYOUT",
          message: "Configuração de layout inválida para salvar o modelo.",
          status: 400,
        });
      }

      const result = await this.useCase.execute({
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        name: readText({ value: body.name }),
        templatePdfKey: readOptionalText({ value: body.templatePdfKey }),
        templatePdfName: readOptionalText({ value: body.templatePdfName }),
        layoutConfig: body.layoutConfig as CertificateLayoutConfig,
        emailConfig:
          body.emailConfig && typeof body.emailConfig === "object"
            ? (body.emailConfig as CertificateEmailConfig)
            : null,
        workloadHoursDefault:
          body.workloadHoursDefault !== undefined
            ? readInteger({ value: body.workloadHoursDefault, fallback: 8 })
            : null,
        ip: getClientIp(request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type DeleteCertificatePresetControllerRequest = {
  request: NextRequest;
  presetId: string;
};

export type DeleteCertificatePresetControllerDependencies = {
  useCase: DeleteCertificatePresetUseCase;
};

export class DeleteCertificatePresetController extends Controller<
  DeleteCertificatePresetControllerRequest,
  NextResponse
> {
  private readonly useCase: DeleteCertificatePresetUseCase;

  constructor(dependencies: DeleteCertificatePresetControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(
    input: DeleteCertificatePresetControllerRequest,
  ): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "certificates:write",
    });
    if (!guard.ok) return guard.response;

    try {
      const result = await this.useCase.execute({
        presetId: input.presetId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

export type RenderCertificatePdfControllerRequest = {
  request: NextRequest;
  code: string;
};

export type RenderCertificatePdfControllerDependencies = {
  useCase: RenderCertificatePdfUseCase;
};

export class RenderCertificatePdfController extends Controller<
  RenderCertificatePdfControllerRequest,
  NextResponse
> {
  private readonly useCase: RenderCertificatePdfUseCase;

  constructor(dependencies: RenderCertificatePdfControllerDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(
    input: RenderCertificatePdfControllerRequest,
  ): Promise<NextResponse> {
    try {
      const result = await this.useCase.execute({ code: input.code });
      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 404 });
      }

      const inline =
        input.request.nextUrl.searchParams.get("inline") === "1" ||
        input.request.nextUrl.searchParams.get("inline") === "true";

      return new NextResponse(Buffer.from(result.value.pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${result.value.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
