import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type GetPrivateRegistrationFileInputDto = { fileId: string; userId: string; canViewAll: boolean };
export type GetPrivateRegistrationFileOutputDto = { originalName: string; mimeType: string; sizeBytes: number; content: Uint8Array };
export type GetPrivateRegistrationFileDependencies = { registrationRepository: RegistrationRepository; fileStorageProvider: IFileStorageProvider };

export class GetPrivateRegistrationFileUseCase extends UseCase<GetPrivateRegistrationFileInputDto, GetPrivateRegistrationFileOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly fileStorageProvider: IFileStorageProvider;

  constructor(dependencies: GetPrivateRegistrationFileDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
  }

  async execute(input: GetPrivateRegistrationFileInputDto): Promise<Result<GetPrivateRegistrationFileOutputDto>> {
    const file = await this.registrationRepository.findPrivateFile({ fileId: input.fileId, userId: input.userId, canViewAll: input.canViewAll });
    if (!file) return Result.fail(new Error("Arquivo não encontrado ou sem permissão de acesso."));
    const stored = await this.fileStorageProvider.read({ key: file.storageKey });
    if (!stored) return Result.fail(new Error("O arquivo não está disponível no armazenamento."));
    return Result.ok({ originalName: file.originalName, mimeType: stored.contentType || file.mimeType, sizeBytes: file.sizeBytes, content: stored.content });
  }
}
