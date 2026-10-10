import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  ParticipantAuthRepository,
  ParticipantEventItem,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import type { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";

export type GetParticipantEventsInputDto = {
  participantId: string;
};

export type GetParticipantEventsOutputDto = {
  events: ParticipantEventItem[];
};

export type GetParticipantEventsDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
  credentialProvider?: ICredentialProvider;
  paymentGateway?: IPaymentGateway;
  processPaymentWebhook?: ProcessPaymentWebhookUseCase;
};

export class GetParticipantEventsUseCase extends UseCase<
  GetParticipantEventsInputDto,
  GetParticipantEventsOutputDto
> {
  private readonly repository: ParticipantAuthRepository;
  private readonly credentialProvider?: ICredentialProvider;
  private readonly paymentGateway?: IPaymentGateway;
  private readonly processPaymentWebhook?: ProcessPaymentWebhookUseCase;

  constructor(dependencies: GetParticipantEventsDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.paymentGateway = dependencies.paymentGateway;
    this.processPaymentWebhook = dependencies.processPaymentWebhook;
  }

  async execute(
    input: GetParticipantEventsInputDto,
  ): Promise<Result<GetParticipantEventsOutputDto>> {
    if (!input.participantId) {
      return Result.fail(new Error("Identificador do participante ausente."));
    }

    let items = await this.repository.listParticipantEvents(input.participantId);

    if (this.paymentGateway?.checkPaymentStatus && this.processPaymentWebhook) {
      let updatedAny = false;
      for (const item of items) {
        if (
          (item.status === "aguardando_pagamento" || item.status === "pendente") &&
          item.paymentProvider === "pagbank" &&
          item.paymentExternalId
        ) {
          const latestWebhook = await this.paymentGateway.checkPaymentStatus({
            referenceId: item.registrationId,
            externalId: item.paymentExternalId,
          });
          if (latestWebhook && latestWebhook.status !== "aguardando") {
            await this.processPaymentWebhook.execute({
              webhook: latestWebhook,
              provider: "pagbank",
            });
            updatedAny = true;
          }
        }
      }
      if (updatedAny) {
        items = await this.repository.listParticipantEvents(input.participantId);
      }
    }

    const events = items.map((item) => {
      if (!this.credentialProvider) return item;
      try {
        const issued = this.credentialProvider.issueAccessToken({
          registrationId: item.registrationId,
        });
        if (!item.accessToken || issued.hash === item.accessToken) {
          return { ...item, accessToken: issued.rawToken };
        }
        return item;
      } catch {
        return item;
      }
    });
    return Result.ok({ events });
  }
}

