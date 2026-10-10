import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { EventStatus } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { PromoteWaitlistUseCase } from "@/modules/ticketing/application/use-cases/promote-waitlist/promote-waitlist.use-case";
import type { ProcessOutboxUseCase } from "@/modules/ticketing/application/use-cases/process-outbox/process-outbox.use-case";

export type TransitionEventInputDto = { eventId: string; nextStatus: EventStatus; justification?: string; userId: string; userName: string; canViewAll: boolean; ip: string | null };
export type TransitionEventOutputDto = EventReadModel;
export type TransitionEventDependencies = {
  eventRepository: EventRepository;
  auditRepository: IAuditRepository;
  promoteWaitlist?: PromoteWaitlistUseCase;
  processOutbox?: ProcessOutboxUseCase;
};

export class TransitionEventUseCase extends UseCase<TransitionEventInputDto, TransitionEventOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly promoteWaitlist?: PromoteWaitlistUseCase;
  private readonly processOutbox?: ProcessOutboxUseCase;

  constructor(dependencies: TransitionEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
    this.promoteWaitlist = dependencies.promoteWaitlist;
    this.processOutbox = dependencies.processOutbox;
  }

  async execute(input: TransitionEventInputDto): Promise<Result<TransitionEventOutputDto>> {
    const event = await this.eventRepository.findById({ id: input.eventId });
    if (!event) return Result.fail(new Error("Evento não encontrado."));
    const beforeStatus = event.status;
    const now = new Date();
    const transition = event.transition({ nextStatus: input.nextStatus, at: now, justification: input.justification });
    if (transition.isFailure) return Result.fail(transition.error);
    const updated = await this.eventRepository.transition({
      eventId: input.eventId, actorId: input.userId, canViewAll: input.canViewAll,
      nextStatus: transition.value.status, at: now, justification: input.justification,
    });
    if (!updated) return Result.fail(new Error("Evento não encontrado ou você não tem acesso."));
    await this.auditRepository.write({ userId: input.userId, userName: input.userName, action: `event.status.${input.nextStatus}`, entity: "event", recordId: input.eventId, beforeData: { status: beforeStatus }, afterData: { status: updated.props.status }, ip: input.ip });

    if (this.promoteWaitlist && updated.capacity.waitlisted > 0) {
      try {
        const promotion = await this.promoteWaitlist.execute({
          eventId: input.eventId,
          at: now,
          maxPromotions: 100,
        });
        if (promotion.isSuccess && promotion.value.promotedCount > 0) {
          try {
            await this.processOutbox?.execute({ limit: 25 });
          } catch {
            // Best-effort outbox dispatch
          }
          const refreshed = await this.eventRepository.getManagedById({
            id: input.eventId,
            userId: input.userId,
            canViewAll: input.canViewAll,
          });
          if (refreshed) return Result.ok(refreshed);
        }
      } catch {
        // Fallback para rotina de manutenção
      }
    }

    return Result.ok(updated);
  }
}
