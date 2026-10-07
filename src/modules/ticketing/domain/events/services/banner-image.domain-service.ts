import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export const MAX_EVENT_BANNER_SIZE_BYTES = 10 * 1024 * 1024;
export type ValidateBannerImageParams = { mimeType: string; sizeBytes: number; content: Uint8Array };
export type ValidatedBannerImage = { mimeType: "image/png" | "image/jpeg"; extension: "png" | "jpg" };

export class BannerImageDomainService extends DomainService<ValidateBannerImageParams, ValidatedBannerImage> {
  execute(params: ValidateBannerImageParams): Result<ValidatedBannerImage> {
    if (params.sizeBytes <= 0 || params.content.byteLength !== params.sizeBytes) return Result.fail(new Error("A imagem do banner está vazia ou inválida."));
    if (params.sizeBytes > MAX_EVENT_BANNER_SIZE_BYTES) return Result.fail(new Error("O banner deve ter no máximo 10 MB."));
    const mimeType = params.mimeType.trim().toLowerCase();
    if (mimeType === "image/png" && hasSignature({ content: params.content, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] })) return Result.ok({ mimeType: "image/png", extension: "png" });
    if (mimeType === "image/jpeg" && hasSignature({ content: params.content, bytes: [0xff, 0xd8, 0xff] })) return Result.ok({ mimeType: "image/jpeg", extension: "jpg" });
    return Result.fail(new Error("Envie uma imagem PNG ou JPG válida para o banner."));
  }
}

type HasSignatureParams = { content: Uint8Array; bytes: readonly number[] };
function hasSignature(params: HasSignatureParams): boolean {
  return params.bytes.every((byte, index) => params.content[index] === byte);
}
