import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";
import type {
  IWaitlistPromotionRepository,
  RegistrationRepository,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

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
  registrationRepository: IWaitlistPromotionRepository &
    Partial<Pick<RegistrationRepository, "findNotificationDetails">>;
  credentialProvider: Pick<ICredentialProvider, "issueAccessToken"> &
    Partial<Pick<ICredentialProvider, "createQrToken">>;
  outboxRepository: Pick<IOutboxRepository, "enqueue">;
  auditRepository: Pick<IAuditRepository, "write">;
  emailSender?: IParticipantEmailSender;
  paymentProvider: "mock" | "pagbank";
  publicBaseUrl: string;
};

export class PromoteWaitlistUseCase extends UseCase<
  PromoteWaitlistInputDto,
  PromoteWaitlistOutputDto
> {
  private readonly registrationRepository: IWaitlistPromotionRepository &
    Partial<Pick<RegistrationRepository, "findNotificationDetails">>;
  private readonly credentialProvider: Pick<ICredentialProvider, "issueAccessToken"> &
    Partial<Pick<ICredentialProvider, "createQrToken">>;
  private readonly outboxRepository: Pick<IOutboxRepository, "enqueue">;
  private readonly auditRepository: Pick<IAuditRepository, "write">;
  private readonly emailSender?: IParticipantEmailSender;
  private readonly paymentProvider: "mock" | "pagbank";
  private readonly publicBaseUrl: string;

  constructor(dependencies: PromoteWaitlistDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.outboxRepository = dependencies.outboxRepository;
    this.auditRepository = dependencies.auditRepository;
    this.emailSender = dependencies.emailSender;
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
      const qrPayload =
        !requiresPayment && this.credentialProvider.createQrToken
          ? this.credentialProvider.createQrToken({
              registrationId: promotion.registrationId,
            })
          : null;
      const details = await this.registrationRepository
        .findNotificationDetails?.({
          registrationCode: promotion.registrationCode,
        })
        .catch(() => null);

      await this.emailSender?.sendWaitlistPromotedEmail?.({
        email: promotion.participantEmail,
        participantName: promotion.participantName,
        registrationCode: promotion.registrationCode,
        eventTitle: promotion.eventTitle,
        eventStartAt: promotion.eventStartAt,
        eventEndAt: details?.eventEndAt,
        modality: details?.modality,
        location: details?.location ?? null,
        onlineUrl: details?.onlineUrl ?? null,
        lotName: details?.lotName ?? null,
        status: promotion.status,
        amountCents: promotion.finalCents,
        waitlistExpiresAt: promotion.waitlistExpiresAt,
        qrPayload,
        participantUrl,
      });

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

      if (!this.emailSender?.sendWaitlistPromotedEmail) {
        await this.outboxRepository.enqueue({
          channel: "email",
          recipient: promotion.participantEmail,
          subject,
          template,
          payload,
        });
      }
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
