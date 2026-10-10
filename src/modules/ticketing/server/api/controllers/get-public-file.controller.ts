import { NextResponse, type NextRequest } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonError } from "@/server/api/http-response.util";
import { GetPublicFileUseCase } from "@/modules/ticketing/application/use-cases/get-public-file/get-public-file.use-case";

export type GetPublicFileRequest = { request: NextRequest; key: string };
export type GetPublicFileDependencies = { useCase: GetPublicFileUseCase };

export class GetPublicFileController extends Controller<GetPublicFileRequest, NextResponse> {
  private readonly useCase: GetPublicFileUseCase;

  constructor(dependencies: GetPublicFileDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: GetPublicFileRequest): Promise<NextResponse> {
    if (!isAllowedPublicFileKey(input.key)) return jsonError({ code: "FILE_NOT_FOUND", message: "Arquivo não encontrado.", status: 404 });
    try {
      const result = await this.useCase.execute({ key: input.key });
      if (result.isFailure) return jsonError({ code: "FILE_NOT_FOUND", message: "Arquivo não encontrado.", status: 404 });
      const body = new Uint8Array(result.value.content).buffer;
      return new NextResponse(body, { status: 200, headers: {
        "Content-Type": result.value.contentType,
        "Content-Length": String(result.value.content.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      } });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

function isAllowedPublicFileKey(key: string): boolean {
  const isAllowedPrefix =
    key.startsWith("public/banners/") || key.startsWith("public/credentials/");
  return (
    isAllowedPrefix &&
    !key.includes("..") &&
    !key.includes("\\") &&
    /\.(png|jpg|jpeg|webp)$/i.test(key)
  );
}
