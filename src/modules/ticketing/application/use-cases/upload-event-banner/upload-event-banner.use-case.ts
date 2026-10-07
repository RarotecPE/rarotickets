import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { BannerImageDomainService } from "@/modules/ticketing/domain/events/services/banner-image.domain-service";

export type UploadEventBannerInputDto = { mimeType: string; sizeBytes: number; content: Uint8Array };
export type UploadEventBannerOutputDto = { bannerUrl: string };
export type UploadEventBannerDependencies = { fileStorageProvider: IFileStorageProvider; idGenerator: IIdGenerator; bannerValidator: BannerImageDomainService };

export class UploadEventBannerUseCase extends UseCase<UploadEventBannerInputDto, UploadEventBannerOutputDto> {
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly idGenerator: IIdGenerator;
  private readonly bannerValidator: BannerImageDomainService;

  constructor(dependencies: UploadEventBannerDependencies) {
    super();
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.idGenerator = dependencies.idGenerator;
    this.bannerValidator = dependencies.bannerValidator;
  }

  async execute(input: UploadEventBannerInputDto): Promise<Result<UploadEventBannerOutputDto>> {
    const validation = this.bannerValidator.execute({ mimeType: input.mimeType, sizeBytes: input.sizeBytes, content: input.content });
    if (validation.isFailure) return Result.fail(validation.error);
    const key = `public/banners/${this.idGenerator.next()}.${validation.value.extension}`;
    const bannerUrl = await this.fileStorageProvider.storePublic({ key, contentType: validation.value.mimeType, content: input.content });
    return Result.ok({ bannerUrl });
  }
}
