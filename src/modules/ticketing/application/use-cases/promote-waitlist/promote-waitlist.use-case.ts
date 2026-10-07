import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IWaitlistPromotionRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

const PROMOTION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_PROMOTIONS_PER_EVENT = 100;

export type PromoteWaitlistInputDto = {
  eventId: string;
  at: Date;
  maxPromotions: number;
};
export type PromoteWaitlistOutputDto = {
  promotedCount: number;
  registrationCodes: string[];
};
export type PromoteWaitlistDependencies = {
  registrationRepository: IWaitlistPromotionRepository;
  credentialProvider: Pick<ICredentialProvider, "issueAccessToken">;
  outboxRepository: Pick<IOutboxRepository, "enqueue">;
  auditRepository: Pick<IAuditRepository, "write">;
  paymentProvider: "mock" | "pagbank";
  publicBaseUrl: string;
};

export class PromoteWaitlistUseCase extends UseCase<
  PromoteWaitlistInputDto,
  PromoteWaitlistOutputDto
> {
  private readonly registrationRepository: IWaitlistPromotionRepository;
  private readonly credentialProvider: Pick<ICredentialProvider, "issueAccessToken">;
  private readonly outboxRepository: Pick<IOutboxRepository, "enqueue">;
  private readonly auditRepository: Pick<IAuditRepository, "write">;
  private readonly paymentProvider: "mock" | "pagbank";
  private readonly publicBaseUrl: string;

  constructor(dependencies: PromoteWaitlistDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.outboxRepository = dependencies.outboxRepository;
    this.auditRepository = dependencies.auditRepository;
    this.paymentProvider = dependencies.paymentProvider;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(
    input: PromoteWaitlistInputDto,
  ): Promise<Result<PromoteWaitlistOutputDto>> {
    if (
      !Number.isInteger(input.maxPromotions) ||
      input.maxPromotions < 1 ||
      input.maxPromotions > MAX_PROMOTIONS_PER_EVENT
    ) {
      return Result.fail(
        new Error(
          `O limite de promoções precisa estar entre 1 e ${MAX_PROMOTIONS_PER_EVENT}.`,
        ),
      );
    }

    const registrationCodes: string[] = [];
    for (let index = 0; index < input.maxPromotions; index += 1) {
      const candidate = await this.registrationRepository.findNextWaitlisted({
        eventId: input.eventId,
        at: input.at,
      });
      if (!candidate) break;

      const accessToken = this.credentialProvider.issueAccessToken({
        registrationId: candidate.registrationId,
      });
      const deadline = new Date(input.at.getTime() + PROMOTION_WINDOW_MS);
      const promotion = await this.registrationRepository.promoteNextWaitlisted({
        eventId: input.eventId,
        registrationId: candidate.registrationId,
        accessTokenHash: accessToken.hash,
        paymentProvider: this.paymentProvider,
        at: input.at,
        expiresAt: deadline,
      });
      if (!promotion) break;

      const participantUrl = `${this.publicBaseUrl}/ingressos/${encodeURIComponent(accessToken.rawToken)}`;
      const requiresPayment = promotion.status === "pendente";
      const template = requiresPayment
        ? "waitlist-promoted"
        : "registration-confirmed";
      const subject = requiresPayment
        ? "Uma vaga foi liberada — conclua sua inscrição em até 24 horas"
        : "Uma vaga foi liberada — sua inscrição está confirmada";
      const payload = {
        name: promotion.participantName,
        email: promotion.participantEmail,
        eventTitle: promotion.eventTitle,
        eventStartAt: promotion.eventStartAt.toISOString(),
        registrationCode: promotion.registrationCode,
        participantUrl,
        amountCents: promotion.finalCents,
        waitlistExpiresAt: promotion.waitlistExpiresAt?.toISOString() ?? "",
      };

      await this.outboxRepository.enqueue({
        channel: "email",
        recipient: promotion.participantEmail,
        subject,
        template,
        payload,
      });
      if (promotion.participantPhone) {
        await this.outboxRepository.enqueue({
          channel: "whatsapp",
          recipient: promotion.participantPhone,
          subject,
          template,
          payload,
        });
      }
      await this.auditRepository.write({
        userId: "system:waitlist",
        userName: "Promoção automática da lista de espera",
        action: "registration.waitlist_promoted",
        entity: "registration",
        recordId: promotion.registrationId,
        beforeData: { status: "lista_espera" },
        afterData: {
          status: promotion.status,
          eventId: promotion.eventId,
          registrationCode: promotion.registrationCode,
          finalCents: promotion.finalCents,
          waitlistExpiresAt: promotion.waitlistExpiresAt?.toISOString() ?? null,
        },
        ip: null,
      });
      registrationCodes.push(promotion.registrationCode);
    }

    return Result.ok({
      promotedCount: registrationCodes.length,
      registrationCodes,
    });
  }
}
