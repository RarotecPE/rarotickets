import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type GetPublicFileInputDto = { key: string };
export type GetPublicFileOutputDto = { content: Uint8Array; contentType: string };
export type GetPublicFileDependencies = { fileStorageProvider: IFileStorageProvider };

export class GetPublicFileUseCase extends UseCase<GetPublicFileInputDto, GetPublicFileOutputDto> {
  private readonly fileStorageProvider: IFileStorageProvider;

  constructor(dependencies: GetPublicFileDependencies) {
    super();
    this.fileStorageProvider = dependencies.fileStorageProvider;
  }

  async execute(input: GetPublicFileInputDto): Promise<Result<GetPublicFileOutputDto>> {
    if (!input.key.startsWith("public/")) return Result.fail(new Error("Arquivo não encontrado."));
    const stored = await this.fileStorageProvider.read({ key: input.key });
    return stored ? Result.ok(stored) : Result.fail(new Error("Arquivo não encontrado."));
  }
}
