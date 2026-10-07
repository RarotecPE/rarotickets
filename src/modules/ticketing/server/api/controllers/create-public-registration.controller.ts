import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { getClientIp } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { CreatePublicRegistrationUseCase } from "@/modules/ticketing/application/use-cases/create-public-registration/create-public-registration.use-case";
import { mapCreatePublicRegistrationRequest, parseMultipartRegistrationForm } from "@/modules/ticketing/server/api/dtos/create-public-registration.request.dto";

export type CreatePublicRegistrationRequest = { request: NextRequest; eventSlug: string };
export type CreatePublicRegistrationDependencies = { useCase: CreatePublicRegistrationUseCase };

export class CreatePublicRegistrationController extends Controller<CreatePublicRegistrationRequest, NextResponse> {
  private readonly useCase: CreatePublicRegistrationUseCase;
  constructor(dependencies: CreatePublicRegistrationDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: CreatePublicRegistrationRequest): Promise<NextResponse> {
    try {
      const isMultipart = input.request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data") ?? false;
      const multipart = isMultipart ? await parseMultipartRegistrationForm({ formData: await input.request.formData() }) : null;
      if (multipart?.isFailure) return resultFailureResponse({ error: multipart.error, status: 400 });
      const body: unknown = multipart?.isSuccess ? multipart.value.body : await input.request.json().catch(() => null);
      const files = multipart?.isSuccess ? multipart.value.files : [];
      const parsed = mapCreatePublicRegistrationRequest({ body, files, eventSlug: input.eventSlug, ip: getClientIp(input.request) });
      if (parsed.isFailure) return resultFailureResponse({ error: parsed.error, status: 400 });
      const result = await this.useCase.execute(parsed.value);
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
