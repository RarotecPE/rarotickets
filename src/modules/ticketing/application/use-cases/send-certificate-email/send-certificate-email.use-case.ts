import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { interpolateCertificateTemplate } from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { CertificateRecipientVariables } from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";
import {
  renderCertificatePdf,
  uint8ArrayToBase64,
} from "@/shared/utils/certificate-pdf.util";

export type SendCertificateEmailInputDto = {
  eventId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  recipientKey?: string;
  testRecipient?: string;
  ip: string | null;
};

export type SendCertificateEmailOutputDto = {
  sent: boolean;
  toEmail: string;
  authenticationCode: string;
  attachmentFilename: string;
  sentAt: string;
};

export type SendCertificateEmailDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
  emailSender: IParticipantEmailSender;
  auditRepository: IAuditRepository;
  publicBaseUrl: string;
};

export class SendCertificateEmailUseCase extends UseCase<
  SendCertificateEmailInputDto,
  SendCertificateEmailOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly emailSender: IParticipantEmailSender;
  private readonly auditRepository: IAuditRepository;
  private readonly publicBaseUrl: string;

  constructor(dependencies: SendCertificateEmailDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.emailSender = dependencies.emailSender;
    this.auditRepository = dependencies.auditRepository;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(
    input: SendCertificateEmailInputDto,
  ): Promise<Result<SendCertificateEmailOutputDto>> {
    const now = new Date();
    let workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão de envio."),
      );
    }

    const isTest = Boolean(input.testRecipient?.trim());

    if (!isTest) {
      // Ensure certificates are issued for selected recipients before sending
      const targetBefore = workspace.recipients.find(
        (r) => r.recipientKey === input.recipientKey,
      );
      if (targetBefore && !targetBefore.authenticationCode) {
        workspace =
          (await this.certificateRepository.issueWorkspaceBatch({
            eventId: input.eventId,
            actorId: input.userId,
            canViewAll: input.canViewAll,
            at: now,
          })) ?? workspace;
      }
    }

    const targetRecipient = isTest
      ? workspace.recipients.find((r) => r.selected) ?? workspace.recipients[0]
      : workspace.recipients.find((r) => r.recipientKey === input.recipientKey);

    if (!isTest && !targetRecipient) {
      return Result.fail(
        new Error("Destinatário não encontrado no workspace. Salve as alterações e tente novamente."),
      );
    }

    const participantName =
      targetRecipient?.name || "Participante de Demonstração";
    const toEmail = isTest
      ? input.testRecipient!.trim().toLowerCase()
      : (targetRecipient?.email || "").trim().toLowerCase();

    if (!toEmail || !toEmail.includes("@")) {
      if (!isTest && input.recipientKey) {
        await this.certificateRepository.recordRecipientEmailResult({
          eventId: input.eventId,
          recipientKey: input.recipientKey,
          status: "failed",
          error: "Endereço de e-mail ausente ou inválido.",
          at: now,
        });
      }
      return Result.fail(
        new Error("Endereço de e-mail do destinatário ausente ou inválido."),
      );
    }

    const authenticationCode =
      targetRecipient?.authenticationCode || "CERT-2026-DEMO0001";
    const verificationUrl = `${this.publicBaseUrl}/certificados/${encodeURIComponent(authenticationCode)}`;
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(workspace.event.startAt);

    const variables: CertificateRecipientVariables = {
      nome: participantName,
      email: toEmail,
      cpf: targetRecipient?.cpf || "",
      empresa: targetRecipient?.company || "",
      cargo: targetRecipient?.jobTitle || "",
      evento: workspace.event.title,
      data_evento: formattedDate,
      carga_horaria: `${workspace.event.workloadHours}h`,
      descricao_certificado: workspace.event.certificateDescription,
      responsavel: workspace.event.responsibleName,
      codigo_autenticacao: authenticationCode,
      link_validacao: verificationUrl,
      codigo_inscricao: targetRecipient?.registrationCode || "",
      customVars: targetRecipient?.customVars ?? {},
    };

    let basePdfBytes: Uint8Array | null = null;
    if (workspace.event.templatePdfKey) {
      const stored = await this.fileStorageProvider.read({
        key: workspace.event.templatePdfKey,
      });
      if (stored) {
        basePdfBytes = stored.content;
      }
    }

    const pdfBytes = await renderCertificatePdf({
      basePdfBytes,
      layoutConfig: workspace.layoutConfig,
      variables,
    });
    const attachmentBase64 = uint8ArrayToBase64({ bytes: pdfBytes });

    const rawAttachmentName =
      interpolateCertificateTemplate({
        template: workspace.emailConfig.attachmentNamePattern,
        variables,
      }).trim() || "Certificado.pdf";
    const attachmentFilename = rawAttachmentName.toLowerCase().endsWith(".pdf")
      ? rawAttachmentName
      : `${rawAttachmentName}.pdf`;

    const resolvedSubject =
      interpolateCertificateTemplate({
        template: workspace.emailConfig.subject,
        variables,
      }).trim() || `Seu Certificado — ${workspace.event.title}`;
    const finalSubject = isTest
      ? `[TESTE] ${resolvedSubject}`.slice(0, 160)
      : resolvedSubject.slice(0, 160);

    const resolvedBody = interpolateCertificateTemplate({
      template: workspace.emailConfig.body,
      variables,
    }).trim();

    if (!this.emailSender.sendCertificateEmail) {
      return Result.fail(
        new Error("Provedor de envio de certificados não configurado."),
      );
    }

    const extraAttachments: Array<{
      filename: string;
      contentType: string;
      contentBase64?: string;
      contentUrl?: string;
    }> = [];
    for (const extra of workspace.emailConfig.extraAttachments ?? []) {
      const signedUrl = await this.fileStorageProvider.getTemporaryReadUrl?.({
        key: extra.key,
        expiresInSeconds: 600,
      });
      if (signedUrl) {
        extraAttachments.push({
          filename: extra.filename,
          contentType: extra.contentType || "application/octet-stream",
          contentUrl: signedUrl,
        });
        continue;
      }

      const storedExtra = await this.fileStorageProvider.read({
        key: extra.key,
      });
      if (!storedExtra) continue;
      extraAttachments.push({
        filename: extra.filename,
        contentType:
          extra.contentType ||
          storedExtra.contentType ||
          "application/octet-stream",
        contentBase64: uint8ArrayToBase64({ bytes: storedExtra.content }),
      });
    }

    try {
      const sendResult = await this.emailSender.sendCertificateEmail({
        toEmail,
        subject: finalSubject,
        bodyText: resolvedBody,
        participantName,
        eventTitle: workspace.event.title,
        workloadHours: workspace.event.workloadHours,
        authenticationCode,
        verificationUrl,
        attachmentFilename,
        attachmentBase64,
        extraAttachments,
        isTest,
      });

      if (!isTest && input.recipientKey) {
        await this.certificateRepository.recordRecipientEmailResult({
          eventId: input.eventId,
          recipientKey: input.recipientKey,
          status: "sent",
          messageId: sendResult.messageId,
          at: now,
        });

        await this.auditRepository.write({
          userId: input.userId,
          userName: input.userName,
          action: "certificates.email_sent",
          entity: "event",
          recordId: input.eventId,
          beforeData: null,
          afterData: {
            recipientKey: input.recipientKey,
            toEmail,
            authenticationCode,
          },
          ip: input.ip,
        });
      }

      return Result.ok({
        sent: true,
        toEmail,
        authenticationCode,
        attachmentFilename,
        sentAt: now.toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Falha ao disparar e-mail pelo RaroNexus.";

      if (!isTest && input.recipientKey) {
        await this.certificateRepository.recordRecipientEmailResult({
          eventId: input.eventId,
          recipientKey: input.recipientKey,
          status: "failed",
          error: errorMessage,
          at: now,
        });
      }

      return Result.fail(new Error(errorMessage));
    }
  }
}
