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
import type { PromoteWaitlistUseCase } from "@/modules/ticketing/application/use-cases/promote-waitlist/promote-waitlist.use-case";
import type { ProcessOutboxUseCase } from "@/modules/ticketing/application/use-cases/process-outbox/process-outbox.use-case";

const MAX_WAITLIST_PROMOTIONS_ON_UPDATE = 100;

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
  promoteWaitlist?: PromoteWaitlistUseCase;
  processOutbox?: ProcessOutboxUseCase;
};

export class UpdateEventUseCase extends UseCase<UpdateEventInputDto, UpdateEventOutputDto> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly idGenerator?: IIdGenerator;
  private readonly promoteWaitlist?: PromoteWaitlistUseCase;
  private readonly processOutbox?: ProcessOutboxUseCase;

  constructor(dependencies: UpdateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
    this.idGenerator = dependencies.idGenerator;
    this.promoteWaitlist = dependencies.promoteWaitlist;
    this.processOutbox = dependencies.processOutbox;
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

    if (
      input.props.chargeType === "pago" &&
      input.props.maxCapacity > current.props.maxCapacity &&
      lots &&
      lots.length > 0
    ) {
      const totalActiveLotCapacity = lots
        .filter((lot) => lot.active)
        .reduce((sum, lot) => sum + lot.maxQuantity, 0);
      if (totalActiveLotCapacity < input.props.maxCapacity) {
        const missingCapacity = input.props.maxCapacity - totalActiveLotCapacity;
        let targetIndex = -1;
        for (let i = lots.length - 1; i >= 0; i -= 1) {
          if (lots[i].active) {
            targetIndex = i;
            break;
          }
        }
        const indexToUpdate = targetIndex >= 0 ? targetIndex : lots.length - 1;
        lots[indexToUpdate] = {
          ...lots[indexToUpdate],
          maxQuantity: lots[indexToUpdate].maxQuantity + missingCapacity,
        };
      }
    }

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
      beforeData: {
        title: current.props.title,
        summary: current.props.summary,
        maxCapacity: current.props.maxCapacity,
      },
      afterData: {
        title: updated.props.title,
        summary: updated.props.summary,
        maxCapacity: updated.props.maxCapacity,
      },
      ip: input.ip,
    });

    if (this.promoteWaitlist && updated.capacity.waitlisted > 0) {
      try {
        const promotion = await this.promoteWaitlist.execute({
          eventId: input.eventId,
          at: updatedAt,
          maxPromotions: MAX_WAITLIST_PROMOTIONS_ON_UPDATE,
        });
        if (promotion.isSuccess && promotion.value.promotedCount > 0) {
          try {
            await this.processOutbox?.execute({ limit: 25 });
          } catch {
            // O envio imediato do outbox não deve impedir o retorno da atualização do evento.
          }
          const refreshed = await this.eventRepository.getManagedById({
            id: input.eventId,
            userId: input.userId,
            canViewAll: input.canViewAll,
          });
          if (refreshed) return Result.ok(refreshed);
        }
      } catch {
        // Caso ocorra falha transitória na promoção imediata, a rotina de manutenção processará a fila.
      }
    }

    return Result.ok(updated);
  }
}

