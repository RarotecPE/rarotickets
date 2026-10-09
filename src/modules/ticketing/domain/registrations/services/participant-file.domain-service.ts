import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export const MAX_PARTICIPANT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export type ValidateParticipantFileParams = { fileName: string; mimeType: string; sizeBytes: number; content: Uint8Array };
export type ValidatedParticipantFile = { originalName: string; mimeType: "application/pdf" | "image/png" | "image/jpeg"; extension: "pdf" | "png" | "jpg" };

export class ParticipantFileDomainService extends DomainService<ValidateParticipantFileParams, ValidatedParticipantFile> {
  execute(params: ValidateParticipantFileParams): Result<ValidatedParticipantFile> {
    if (params.sizeBytes <= 0 || params.content.byteLength !== params.sizeBytes) return Result.fail(new Error("O arquivo enviado está vazio ou inválido."));
    if (params.sizeBytes > MAX_PARTICIPANT_FILE_SIZE_BYTES) return Result.fail(new Error("Cada arquivo deve ter no máximo 10 MB."));
    const fileType = getValidatedFileType({ mimeType: params.mimeType, content: params.content });
    if (!fileType) return Result.fail(new Error("Envie somente arquivos PDF, PNG ou JPG válidos."));
    const originalName = normalizeFileName(params.fileName);
    if (!originalName || originalName.length > 255) return Result.fail(new Error("O nome do arquivo é inválido ou muito longo."));
    return Result.ok({ originalName, mimeType: fileType.mimeType, extension: fileType.extension });
  }
}

type FileTypeParams = { mimeType: string; content: Uint8Array };
type StartsWithBytesParams = { content: Uint8Array; signature: readonly number[] };
type FileName = string;
function getValidatedFileType(params: FileTypeParams): Pick<ValidatedParticipantFile, "mimeType" | "extension"> | null {
  const normalizedType = params.mimeType.trim().toLowerCase();
  if (normalizedType === "application/pdf" && startsWithBytes({ content: params.content, signature: [0x25, 0x50, 0x44, 0x46, 0x2d] })) return { mimeType: "application/pdf", extension: "pdf" };
  if (normalizedType === "image/png" && startsWithBytes({ content: params.content, signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] })) return { mimeType: "image/png", extension: "png" };
  if (normalizedType === "image/jpeg" && startsWithBytes({ content: params.content, signature: [0xff, 0xd8, 0xff] })) return { mimeType: "image/jpeg", extension: "jpg" };
  return null;
}

function startsWithBytes(params: StartsWithBytesParams): boolean {
  return params.signature.every((byte, index) => params.content[index] === byte);
}

function normalizeFileName(fileName: FileName): string {
  return fileName.trim().replace(/[\\/]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "");
}
