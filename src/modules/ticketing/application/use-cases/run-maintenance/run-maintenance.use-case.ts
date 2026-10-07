import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ProcessOutboxUseCase } from "@/modules/ticketing/application/use-cases/process-outbox/process-outbox.use-case";
import type { PromoteWaitlistUseCase } from "@/modules/ticketing/application/use-cases/promote-waitlist/promote-waitlist.use-case";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

const MAX_WAITLIST_PROMOTIONS_PER_EVENT = 100;

export type RunMaintenanceInputDto = { limit: number };
export type RunMaintenanceOutputDto = {
  expiredReservations: number;
  waitlistPromotions: number;
  processed: number;
  sent: number;
  failed: number;
  fallbackQueued: number;
};
export type RunMaintenanceDependencies = {
  registrationRepository: RegistrationRepository;
  promoteWaitlist: PromoteWaitlistUseCase;
  processOutbox: ProcessOutboxUseCase;
};

export class RunMaintenanceUseCase extends UseCase<
  RunMaintenanceInputDto,
  RunMaintenanceOutputDto
> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly promoteWaitlist: PromoteWaitlistUseCase;
  private readonly processOutbox: ProcessOutboxUseCase;

  constructor(dependencies: RunMaintenanceDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.promoteWaitlist = dependencies.promoteWaitlist;
    this.processOutbox = dependencies.processOutbox;
  }

  async execute(
    input: RunMaintenanceInputDto,
  ): Promise<Result<RunMaintenanceOutputDto>> {
    const at = new Date();
    const expiration = await this.registrationRepository.expireReservations({ at });
    const waitlistedEventIds =
      await this.registrationRepository.listWaitlistedEventIds();
    let waitlistPromotions = 0;
    for (const eventId of waitlistedEventIds) {
      const result = await this.promoteWaitlist.execute({
        eventId,
        at,
        maxPromotions: MAX_WAITLIST_PROMOTIONS_PER_EVENT,
      });
      if (result.isFailure) return Result.fail(result.error);
      waitlistPromotions += result.value.promotedCount;
    }

    const outboxResult = await this.processOutbox.execute({
      limit: input.limit,
    });
    if (outboxResult.isFailure) return Result.fail(outboxResult.error);
    return Result.ok({
      expiredReservations: expiration.expiredCount,
      waitlistPromotions,
      ...outboxResult.value,
    });
  }
}
