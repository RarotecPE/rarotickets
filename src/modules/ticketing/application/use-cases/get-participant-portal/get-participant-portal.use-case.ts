import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ParticipantPortalView } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import type { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";

export type GetParticipantPortalInputDto = { accessToken: string };
export type GetParticipantPortalOutputDto = ParticipantPortalView;
export type GetParticipantPortalDependencies = {
  registrationRepository: RegistrationRepository;
  credentialProvider: ICredentialProvider;
  paymentGateway?: IPaymentGateway;
  processPaymentWebhook?: ProcessPaymentWebhookUseCase;
};

export class GetParticipantPortalUseCase extends UseCase<GetParticipantPortalInputDto, GetParticipantPortalOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly paymentGateway?: IPaymentGateway;
  private readonly processPaymentWebhook?: ProcessPaymentWebhookUseCase;

  constructor(dependencies: GetParticipantPortalDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.paymentGateway = dependencies.paymentGateway;
    this.processPaymentWebhook = dependencies.processPaymentWebhook;
  }

  async execute(input: GetParticipantPortalInputDto): Promise<Result<GetParticipantPortalOutputDto>> {
    const rawOrHash = input.accessToken.trim();
    const tokenHash = this.credentialProvider.hashToken({ token: rawOrHash });
    let lookupHash = tokenHash;
    let portal = await this.registrationRepository.findPortal({ accessTokenHash: lookupHash });
    if (!portal && /^[a-f0-9]{64}$/i.test(rawOrHash)) {
      lookupHash = rawOrHash.toLowerCase();
      portal = await this.registrationRepository.findPortal({
        accessTokenHash: lookupHash,
      });
    }
    if (!portal) return Result.fail(new Error("Este link não é válido ou expirou."));

    if (
      (portal.status === "aguardando_pagamento" || portal.status === "pendente") &&
      portal.paymentProvider === "pagbank" &&
      portal.paymentExternalId &&
      this.paymentGateway?.checkPaymentStatus &&
      this.processPaymentWebhook
    ) {
      const latestWebhook = await this.paymentGateway.checkPaymentStatus({
        referenceId: portal.registrationId,
        externalId: portal.paymentExternalId,
      });
      if (latestWebhook && latestWebhook.status !== "aguardando") {
        await this.processPaymentWebhook.execute({
          webhook: latestWebhook,
          provider: "pagbank",
        });
        const refreshed = await this.registrationRepository.findPortal({
          accessTokenHash: lookupHash,
        });
        if (refreshed) {
          portal = refreshed;
        }
      }
    }

    if (portal.status !== "confirmada") return Result.ok(portal);
    const qrPayload = this.credentialProvider.createQrToken({ registrationId: portal.registrationId });
    return Result.ok({ ...portal, qrPayload, credentialToken: qrPayload });
  }
}
