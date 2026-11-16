import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import {
  DEFAULT_CERTIFICATE_LAYOUT_CONFIG,
  sanitizeCertificateFilename,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { renderCertificatePdf } from "@/shared/utils/certificate-pdf.util";

export type RenderCertificatePdfInputDto = {
  code: string;
};

export type RenderCertificatePdfOutputDto = {
  pdfBytes: Uint8Array;
  filename: string;
};

export type RenderCertificatePdfDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
  publicBaseUrl: string;
};

export class RenderCertificatePdfUseCase extends UseCase<
  RenderCertificatePdfInputDto,
  RenderCertificatePdfOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly publicBaseUrl: string;

  constructor(dependencies: RenderCertificatePdfDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(
    input: RenderCertificatePdfInputDto,
  ): Promise<Result<RenderCertificatePdfOutputDto>> {
    const renderable = await this.certificateRepository.findRenderableByCode({
      code: input.code,
    });
    if (!renderable) {
      return Result.fail(new Error("Certificado não encontrado."));
    }

    let basePdfBytes: Uint8Array | null = null;
    if (renderable.templatePdfKey) {
      const stored = await this.fileStorageProvider.read({
        key: renderable.templatePdfKey,
      });
      if (stored) {
        basePdfBytes = stored.content;
      }
    }

    const verificationUrl = `${this.publicBaseUrl}/certificados/${encodeURIComponent(renderable.certificate.authenticationCode)}`;

    const pdfBytes = await renderCertificatePdf({
      basePdfBytes,
      layoutConfig: renderable.layoutConfig ?? DEFAULT_CERTIFICATE_LAYOUT_CONFIG,
      variables: {
        ...renderable.variables,
        link_validacao: verificationUrl,
      },
    });

    const safeParticipant = sanitizeCertificateFilename({
      value: renderable.certificate.participantName,
    });

    return Result.ok({
      pdfBytes,
      filename: `Certificado_${safeParticipant}_${renderable.certificate.authenticationCode}.pdf`,
    });
  }
}
