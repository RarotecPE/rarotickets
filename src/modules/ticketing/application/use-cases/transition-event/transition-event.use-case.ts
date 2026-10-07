import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { EventStatus } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type TransitionEventInputDto = { eventId: string; nextStatus: EventStatus; justification?: string; userId: string; userName: string; canViewAll: boolean; ip: string | null };
export type TransitionEventOutputDto = EventReadModel;
export type TransitionEventDependencies = { eventRepository: EventRepository; auditRepository: IAuditRepository };

export class TransitionEventUseCase extends UseCase<TransitionEventInputDto, TransitionEventOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  constructor(dependencies: TransitionEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
  }
  async execute(input: TransitionEventInputDto): Promise<Result<TransitionEventOutputDto>> {
    const event = await this.eventRepository.findById({ id: input.eventId });
    if (!event) return Result.fail(new Error("Evento não encontrado."));
    const beforeStatus = event.status;
    const transition = event.transition({ nextStatus: input.nextStatus, at: new Date(), justification: input.justification });
    if (transition.isFailure) return Result.fail(transition.error);
    const updated = await this.eventRepository.transition({
      eventId: input.eventId, actorId: input.userId, canViewAll: input.canViewAll,
      nextStatus: transition.value.status, at: new Date(), justification: input.justification,
    });
    if (!updated) return Result.fail(new Error("Evento não encontrado ou você não tem acesso."));
    await this.auditRepository.write({ userId: input.userId, userName: input.userName, action: `event.status.${input.nextStatus}`, entity: "event", recordId: input.eventId, beforeData: { status: beforeStatus }, afterData: { status: updated.props.status }, ip: input.ip });
    return Result.ok(updated);
  }
}
