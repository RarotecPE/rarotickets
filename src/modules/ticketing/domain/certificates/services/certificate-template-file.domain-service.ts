import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export const MAX_CERTIFICATE_TEMPLATE_SIZE_BYTES = 10 * 1024 * 1024;

export type ValidateCertificateTemplateParams = {
  mimeType: string;
  sizeBytes: number;
  content: Uint8Array;
  originalName: string;
};

export type ValidatedCertificateTemplate = {
  mimeType: "application/pdf";
  extension: "pdf";
  sanitizedName: string;
};

export class CertificateTemplateFileDomainService extends DomainService<
  ValidateCertificateTemplateParams,
  ValidatedCertificateTemplate
> {
  execute(
    params: ValidateCertificateTemplateParams,
  ): Result<ValidatedCertificateTemplate> {
    if (
      params.sizeBytes <= 0 ||
      params.content.byteLength !== params.sizeBytes
    ) {
      return Result.fail(
        new Error("O arquivo PDF do modelo está vazio ou corrompido."),
      );
    }

    if (params.sizeBytes > MAX_CERTIFICATE_TEMPLATE_SIZE_BYTES) {
      return Result.fail(
        new Error("O modelo de certificado em PDF deve ter no máximo 10 MB."),
      );
    }

    const mimeType = params.mimeType.trim().toLowerCase();
    const isPdfMime =
      mimeType === "application/pdf" ||
      params.originalName.toLowerCase().endsWith(".pdf");

    if (!isPdfMime || !hasPdfSignature({ content: params.content })) {
      return Result.fail(
        new Error("Envie um arquivo PDF válido (.pdf) para o modelo de certificado."),
      );
    }

    const safeName =
      params.originalName
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 200) || "modelo-certificado.pdf";

    return Result.ok({
      mimeType: "application/pdf",
      extension: "pdf",
      sanitizedName: safeName.toLowerCase().endsWith(".pdf")
        ? safeName
        : `${safeName}.pdf`,
    });
  }
}

type HasPdfSignatureParams = { content: Uint8Array };
function hasPdfSignature(params: HasPdfSignatureParams): boolean {
  // "%PDF-" in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2d]
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  if (params.content.byteLength < signature.length) return false;
  return signature.every((byte, idx) => params.content[idx] === byte);
}
