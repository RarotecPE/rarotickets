import { describe, expect, it } from "vitest";
import { CertificateTemplateFileDomainService } from "./certificate-template-file.domain-service";

describe("CertificateTemplateFileDomainService", () => {
  it("aceita um arquivo PDF válido com assinatura %PDF-", () => {
    const service = new CertificateTemplateFileDomainService();
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

    const result = service.execute({
      mimeType: "application/pdf",
      sizeBytes: content.byteLength,
      originalName: "Modelo Certificado 2026.pdf",
      content,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.mimeType).toBe("application/pdf");
    expect(result.value.extension).toBe("pdf");
    expect(result.value.sanitizedName).toBe("Modelo Certificado 2026.pdf");
  });

  it("rejeita arquivo sem assinatura %PDF-", () => {
    const service = new CertificateTemplateFileDomainService();
    const invalidContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const result = service.execute({
      mimeType: "application/pdf",
      sizeBytes: invalidContent.byteLength,
      originalName: "falso.pdf",
      content: invalidContent,
    });

    expect(result.isFailure).toBe(true);
  });
});
