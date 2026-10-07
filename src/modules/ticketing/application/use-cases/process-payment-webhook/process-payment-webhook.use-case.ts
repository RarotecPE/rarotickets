import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { PaymentWebhook } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { PaymentWebhookUpdateResult } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type ProcessPaymentWebhookInputDto = { webhook: PaymentWebhook; provider: "pagbank" | "mock" };
export type ProcessPaymentWebhookOutputDto = PaymentWebhookUpdateResult;
export type ProcessPaymentWebhookDependencies = { registrationRepository: RegistrationRepository; credentialProvider: ICredentialProvider; outboxRepository: IOutboxRepository; auditRepository: IAuditRepository; publicBaseUrl: string };

export class ProcessPaymentWebhookUseCase extends UseCase<ProcessPaymentWebhookInputDto, ProcessPaymentWebhookOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly outboxRepository: IOutboxRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly publicBaseUrl: string;

  constructor(dependencies: ProcessPaymentWebhookDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.outboxRepository = dependencies.outboxRepository;
    this.auditRepository = dependencies.auditRepository;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(input: ProcessPaymentWebhookInputDto): Promise<Result<ProcessPaymentWebhookOutputDto>> {
    const webhook = input.webhook;
    const result = await this.registrationRepository.applyPaymentWebhook({
      provider: input.provider,
      eventId: webhook.eventId,
      referenceId: webhook.referenceId,
      externalId: webhook.externalId,
      status: webhook.status,
      amountCents: webhook.amountCents,
      payload: webhook.rawPayload,
      at: new Date(),
    });
    if (result.status === "confirmada" && !result.duplicate && result.registrationCode) {
      await this.enqueueConfirmation(result.registrationCode);
    }
    if (!result.duplicate && result.registrationCode) {
      await this.auditRepository.write({ userId: "system:payment-webhook", userName: "PagBank webhook", action: "payment.status_updated", entity: "registration", recordId: result.registrationCode, beforeData: null, afterData: { status: result.status, provider: input.provider, refundRequired: result.refundRequired }, ip: null });
    }
    return Result.ok(result);
  }

  private async enqueueConfirmation(registrationCode: string): Promise<void> {
    const details = await this.registrationRepository.findNotificationDetails({ registrationCode });
    if (!details) return;
    const access = this.credentialProvider.issueAccessToken({ registrationId: details.registrationId });
    const participantUrl = `${this.publicBaseUrl}/ingressos/${access.rawToken}`;
    const payload = { name: details.participantName, email: details.participantEmail, eventTitle: details.eventTitle, eventStartAt: details.eventStartAt.toISOString(), registrationCode: details.registrationCode, participantUrl };
    await this.outboxRepository.enqueue({ channel: "email", recipient: details.participantEmail, subject: "Pagamento aprovado — inscrição confirmada", template: "registration-confirmed", payload });
    if (details.participantPhone) await this.outboxRepository.enqueue({ channel: "whatsapp", recipient: details.participantPhone, subject: "Inscrição confirmada", template: "registration-confirmed", payload });
  }
}
