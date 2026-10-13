import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";

export type ConfirmManualPaymentInputDto = {
  registrationId: string;
  userId: string;
  userName: string;
  canManageAll: boolean;
  ip: string | null;
};

export type ConfirmManualPaymentOutputDto = {
  registrationCode: string;
  status: string;
};

export type ConfirmManualPaymentDependencies = {
  registrationRepository: RegistrationRepository;
  auditRepository: IAuditRepository;
  credentialProvider: ICredentialProvider;
  outboxRepository: IOutboxRepository;
  emailSender?: IParticipantEmailSender;
  publicBaseUrl: string;
};

export class ConfirmManualPaymentUseCase extends UseCase<
  ConfirmManualPaymentInputDto,
  ConfirmManualPaymentOutputDto
> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly outboxRepository: IOutboxRepository;
  private readonly emailSender?: IParticipantEmailSender;
  private readonly publicBaseUrl: string;

  constructor(dependencies: ConfirmManualPaymentDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.auditRepository = dependencies.auditRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.outboxRepository = dependencies.outboxRepository;
    this.emailSender = dependencies.emailSender;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(
    input: ConfirmManualPaymentInputDto,
  ): Promise<Result<ConfirmManualPaymentOutputDto>> {
    const at = new Date();
    const result = await this.registrationRepository.confirmManualPayment({
      registrationId: input.registrationId,
      actorId: input.userId,
      canManageAll: input.canManageAll,
      at,
    });

    if (!result) {
      return Result.fail(
        new Error(
          "Inscrição não encontrada, sem vaga disponível ou status incompatível com confirmação manual.",
        ),
      );
    }

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "payment.manual_confirmed",
      entity: "registration",
      recordId: result.registrationCode,
      beforeData: null,
      afterData: {
        registrationId: result.registrationId,
        status: result.status,
        paymentProvider: result.paymentProvider,
        finalCents: result.finalCents,
      },
      ip: input.ip,
    });

    await this.enqueueConfirmationEmail(result);

    return Result.ok({
      registrationCode: result.registrationCode,
      status: result.status,
    });
  }

  private async enqueueConfirmationEmail(
    details: NonNullable<
      Awaited<ReturnType<RegistrationRepository["confirmManualPayment"]>>
    >,
  ): Promise<void> {
    const access = this.credentialProvider.issueAccessToken({
      registrationId: details.registrationId,
    });
    const qrPayload = this.credentialProvider.createQrToken({
      registrationId: details.registrationId,
    });
    const participantUrl = `${this.publicBaseUrl}/ingressos/${access.rawToken}`;

    await this.emailSender?.sendPaymentConfirmedEmail?.({
      email: details.participantEmail,
      participantName: details.participantName,
      registrationCode: details.registrationCode,
      eventTitle: details.eventTitle,
      eventStartAt: details.eventStartAt,
      eventEndAt: details.eventEndAt,
      modality: details.modality,
      location: details.location,
      onlineUrl: details.onlineUrl,
      lotName: details.lotName,
      originalCents: details.originalCents,
      discountCents: details.discountCents,
      finalCents: details.finalCents,
      paymentProvider: details.paymentProvider,
      paymentExternalId: details.paymentExternalId,
      paidAt: details.paidAt,
      qrPayload,
      participantUrl,
    });

    const payload = {
      name: details.participantName,
      email: details.participantEmail,
      eventTitle: details.eventTitle,
      eventStartAt: details.eventStartAt.toISOString(),
      registrationCode: details.registrationCode,
      lotName: details.lotName,
      originalCents: details.originalCents,
      discountCents: details.discountCents,
      finalCents: details.finalCents,
      paymentProvider: details.paymentProvider,
      paymentExternalId: details.paymentExternalId,
      paidAt: details.paidAt.toISOString(),
      qrPayload,
      participantUrl,
    };

    await this.outboxRepository.enqueue({
      channel: "email",
      recipient: details.participantEmail,
      subject: "Pagamento aprovado — inscrição confirmada",
      template: "registration-confirmed",
      payload,
    });
  }
}

