import { UseCase } from "@/@core/application/use-case.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import { Event } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { EventProps } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { EventReadModel, EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type EventEditableProps = Omit<EventProps, "status" | "createdByGlobalUserId" | "deletedAt">;
export type UpdateEventInputDto = { eventId: string; props: EventEditableProps; userId: string; userName: string; canViewAll: boolean; ip: string | null };
export type UpdateEventOutputDto = EventReadModel;
export type UpdateEventDependencies = { eventRepository: EventRepository; auditRepository: IAuditRepository };

export class UpdateEventUseCase extends UseCase<UpdateEventInputDto, UpdateEventOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  constructor(dependencies: UpdateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
  }
  async execute(input: UpdateEventInputDto): Promise<Result<UpdateEventOutputDto>> {
    const current = await this.eventRepository.getManagedById({ id: input.eventId, userId: input.userId, canViewAll: input.canViewAll });
    if (!current) return Result.fail(new Error("Evento não encontrado ou sem acesso."));
    const props: EventProps = { ...input.props, status: current.props.status, createdByGlobalUserId: current.props.createdByGlobalUserId, deletedAt: current.props.deletedAt };
    const updatedAt = new Date();
    const entityResult = Event.create({ id: Identifier.fromExisting(input.eventId), props, createdAt: current.createdAt, updatedAt });
    if (entityResult.isFailure) return Result.fail(entityResult.error);
    const updated = await this.eventRepository.update({ eventId: input.eventId, actorId: input.userId, canViewAll: input.canViewAll, props: entityResult.value.propsSnapshot, updatedAt });
    if (!updated) return Result.fail(new Error("O evento não pôde ser atualizado."));
    await this.auditRepository.write({ userId: input.userId, userName: input.userName, action: "event.updated", entity: "event", recordId: input.eventId, beforeData: { title: current.props.title, summary: current.props.summary }, afterData: { title: updated.props.title, summary: updated.props.summary }, ip: input.ip });
    return Result.ok(updated);
  }
}
