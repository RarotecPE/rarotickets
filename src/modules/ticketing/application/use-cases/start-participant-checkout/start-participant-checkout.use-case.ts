import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";

export type StartParticipantCheckoutInputDto = { accessToken: string };
export type StartParticipantCheckoutOutputDto = { checkoutUrl: string; expiresAt: Date };
export type StartParticipantCheckoutDependencies = { registrationRepository: RegistrationRepository; credentialProvider: ICredentialProvider; paymentGateway: IPaymentGateway; publicBaseUrl: string };

export class StartParticipantCheckoutUseCase extends UseCase<StartParticipantCheckoutInputDto, StartParticipantCheckoutOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly paymentGateway: IPaymentGateway;
  private readonly publicBaseUrl: string;
  constructor(dependencies: StartParticipantCheckoutDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.paymentGateway = dependencies.paymentGateway;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }
  async execute(input: StartParticipantCheckoutInputDto): Promise<Result<StartParticipantCheckoutOutputDto>> {
    const rawOrHash = input.accessToken.trim();
    const accessTokenHash = this.credentialProvider.hashToken({ token: rawOrHash });
    let details = await this.registrationRepository.findCheckoutDetails({ accessTokenHash });
    if (!details && /^[a-f0-9]{64}$/i.test(rawOrHash)) {
      details = await this.registrationRepository.findCheckoutDetails({
        accessTokenHash: rawOrHash.toLowerCase(),
      });
    }
    if (!details || !details.paymentId || !details.expiresAt) return Result.fail(new Error("Não há uma reserva de pagamento ativa para este link."));
    if (details.expiresAt <= new Date()) return Result.fail(new Error("O prazo da reserva expirou."));
    if (details.checkoutUrl) return Result.ok({ checkoutUrl: details.checkoutUrl, expiresAt: details.expiresAt });
    try {
      const checkout = await this.paymentGateway.createCheckout({ referenceId: details.registrationId, description: details.eventTitle, amountCents: details.amountCents, customer: { name: details.customerName, email: details.customerEmail, taxId: details.customerTaxId, phone: details.customerPhone }, notificationUrl: `${this.publicBaseUrl}/api/webhooks/pagbank`, returnUrl: `${this.publicBaseUrl}/ingressos/checkout-retorno` });
      await this.registrationRepository.attachCheckout({ registrationId: details.registrationId, paymentId: details.paymentId, provider: checkout.provider, externalId: checkout.externalId, checkoutUrl: checkout.checkoutUrl, at: new Date() });
      return Result.ok({ checkoutUrl: checkout.checkoutUrl, expiresAt: details.expiresAt });
    } catch (error) {
      return Result.fail(
        error instanceof Error
          ? error
          : new Error("Não foi possível iniciar o pagamento agora. Tente novamente antes do fim da reserva."),
      );
    }
  }
}
