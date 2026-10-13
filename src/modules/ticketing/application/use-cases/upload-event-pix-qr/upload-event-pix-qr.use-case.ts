import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { BannerImageDomainService } from "@/modules/ticketing/domain/events/services/banner-image.domain-service";

export type UploadEventPixQrInputDto = {
  mimeType: string;
  sizeBytes: number;
  content: Uint8Array;
};
export type UploadEventPixQrOutputDto = { pixQrCodeUrl: string };
export type UploadEventPixQrDependencies = {
  fileStorageProvider: IFileStorageProvider;
  idGenerator: IIdGenerator;
  imageValidator: BannerImageDomainService;
};

export class UploadEventPixQrUseCase extends UseCase<
  UploadEventPixQrInputDto,
  UploadEventPixQrOutputDto
> {
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly idGenerator: IIdGenerator;
  private readonly imageValidator: BannerImageDomainService;

  constructor(dependencies: UploadEventPixQrDependencies) {
    super();
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.idGenerator = dependencies.idGenerator;
    this.imageValidator = dependencies.imageValidator;
  }

  async execute(
    input: UploadEventPixQrInputDto,
  ): Promise<Result<UploadEventPixQrOutputDto>> {
    const validation = this.imageValidator.execute({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      content: input.content,
    });
    if (validation.isFailure) return Result.fail(validation.error);
    const key = `public/pix-qrcodes/${this.idGenerator.next()}.${validation.value.extension}`;
    const pixQrCodeUrl = await this.fileStorageProvider.storePublic({
      key,
      contentType: validation.value.mimeType,
      content: input.content,
    });
    return Result.ok({ pixQrCodeUrl });
  }
}

