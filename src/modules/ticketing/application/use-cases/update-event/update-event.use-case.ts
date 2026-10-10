import { UseCase } from "@/@core/application/use-case.base";
import { Identifier } from "@/@core/domain/identifier";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import { Result } from "@/@core/domain/result";
import { Event } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { EventProps } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type {
  EventReadModel,
  EventRepository,
  NewEventActivity,
  NewEventField,
  NewEventLot,
} from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import { EventSlug } from "@/modules/ticketing/domain/events/value-objects/event-slug.vo";

export type EventEditableProps = Omit<EventProps, "status" | "createdByGlobalUserId" | "deletedAt">;
export type UpdateEventLotDraft = Omit<NewEventLot, "id"> & { id?: string };
export type UpdateEventFieldDraft = Omit<NewEventField, "id"> & { id?: string };
export type UpdateEventActivityDraft = Omit<NewEventActivity, "id"> & { id?: string };

export type UpdateEventInputDto = {
  eventId: string;
  props: EventEditableProps;
  userId: string;
  userName: string;
  canViewAll: boolean;
  ip: string | null;
  lots?: UpdateEventLotDraft[];
  fields?: UpdateEventFieldDraft[];
  activities?: UpdateEventActivityDraft[];
};
export type UpdateEventOutputDto = EventReadModel;
export type UpdateEventDependencies = {
  eventRepository: EventRepository;
  auditRepository: IAuditRepository;
  idGenerator?: IIdGenerator;
};

export class UpdateEventUseCase extends UseCase<UpdateEventInputDto, UpdateEventOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly idGenerator?: IIdGenerator;

  constructor(dependencies: UpdateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
    this.idGenerator = dependencies.idGenerator;
  }

  async execute(input: UpdateEventInputDto): Promise<Result<UpdateEventOutputDto>> {
    const current = await this.eventRepository.getManagedById({
      id: input.eventId,
      userId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!current) return Result.fail(new Error("Evento não encontrado ou sem acesso."));
    if (current.props.status === "finalizado") {
      return Result.fail(new Error("Eventos finalizados não podem ser editados."));
    }

    const titleSlug = EventSlug.create(input.props.slug || input.props.title);
    if (titleSlug.isFailure) return Result.fail(titleSlug.error);

    const props: EventProps = {
      ...input.props,
      slug: titleSlug.value.value,
      status: current.props.status,
      createdByGlobalUserId: current.props.createdByGlobalUserId,
      deletedAt: current.props.deletedAt,
    };
    const updatedAt = new Date();
    const entityResult = Event.create({
      id: Identifier.fromExisting(input.eventId),
      props,
      createdAt: current.createdAt,
      updatedAt,
    });
    if (entityResult.isFailure) return Result.fail(entityResult.error);

    const nextId = (): string =>
      this.idGenerator?.next() ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const lots: NewEventLot[] | undefined = input.lots?.map((lot) => ({
      ...lot,
      id: lot.id || nextId(),
    }));
    const fields: NewEventField[] | undefined = input.fields?.map((field) => ({
      ...field,
      id: field.id || nextId(),
    }));
    const activities: NewEventActivity[] | undefined = input.activities?.map((activity) => ({
      ...activity,
      id: activity.id || nextId(),
    }));

    const updated = await this.eventRepository.update({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      props: entityResult.value.propsSnapshot,
      updatedAt,
      lots,
      fields,
      activities,
    });
    if (!updated) return Result.fail(new Error("O evento não pôde ser atualizado."));

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "event.updated",
      entity: "event",
      recordId: input.eventId,
      beforeData: { title: current.props.title, summary: current.props.summary },
      afterData: { title: updated.props.title, summary: updated.props.summary },
      ip: input.ip,
    });

    return Result.ok(updated);
  }
}

