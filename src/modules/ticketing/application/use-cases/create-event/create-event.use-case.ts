import { UseCase } from "@/@core/application/use-case.base";
import { Identifier } from "@/@core/domain/identifier";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import { Result } from "@/@core/domain/result";
import { Event } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { EventAddress, EventChargeType, EventModality, EventStatus } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { EventReadModel, EventRepository, NewEventActivity, NewEventField, NewEventLot } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import { EventSlug } from "@/modules/ticketing/domain/events/value-objects/event-slug.vo";
import { EventConfigurationDomainService } from "@/modules/ticketing/domain/events/services/event-configuration.domain-service";

export type EventLotDraft = Omit<NewEventLot, "id"> & { id?: string };
export type EventFieldDraft = Omit<NewEventField, "id"> & { id?: string };
export type EventActivityDraft = Omit<NewEventActivity, "id"> & { id?: string };

export type CreateEventInputDto = {
  title: string;
  description: string;
  summary: string;
  slug: string;
  bannerUrl: string | null;
  modality: EventModality;
  chargeType: EventChargeType;
  startAt: Date;
  endAt: Date;
  registrationStartAt: Date;
  registrationEndAt: Date;
  maxCapacity: number;
  allowsWaitlist: boolean;
  onlineUrl: string | null;
  address: EventAddress | null;
  responsibleName: string;
  responsibleEmail: string;
  certificateEnabled: boolean;
  workloadHours: number;
  certificateDescription: string | null;
  lots: EventLotDraft[];
  fields: EventFieldDraft[];
  activities: EventActivityDraft[];
};
export type CreateEventContext = { userId: string; userName: string; ip: string | null };
export type CreateEventDependencies = { eventRepository: EventRepository; auditRepository: IAuditRepository; idGenerator: IIdGenerator; configurationValidator: EventConfigurationDomainService };

export class CreateEventUseCase extends UseCase<CreateEventInputDto & CreateEventContext, EventReadModel> {
  private readonly eventRepository: EventRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly idGenerator: IIdGenerator;
  private readonly configurationValidator: EventConfigurationDomainService;

  constructor(dependencies: CreateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRepository = dependencies.auditRepository;
    this.idGenerator = dependencies.idGenerator;
    this.configurationValidator = dependencies.configurationValidator;
  }

  async execute(input: CreateEventInputDto & CreateEventContext): Promise<Result<EventReadModel>> {
    const titleSlug = EventSlug.create(input.slug || input.title);
    if (titleSlug.isFailure) return Result.fail(titleSlug.error);
    const configuration = this.configurationValidator.execute({
      chargeType: input.chargeType,
      registrationStartAt: input.registrationStartAt,
      registrationEndAt: input.registrationEndAt,
      eventStartAt: input.startAt,
      eventEndAt: input.endAt,
      lots: input.lots,
      fields: input.fields,
      activities: input.activities,
    });
    if (configuration.isFailure) return Result.fail(configuration.error);
    const now = new Date();
    const props = {
      title: input.title,
      description: input.description,
      summary: input.summary,
      slug: titleSlug.value.value,
      bannerUrl: input.bannerUrl,
      modality: input.modality,
      chargeType: input.chargeType,
      status: "rascunho" as EventStatus,
      startAt: input.startAt,
      endAt: input.endAt,
      registrationStartAt: input.registrationStartAt,
      registrationEndAt: input.registrationEndAt,
      maxCapacity: input.maxCapacity,
      allowsWaitlist: input.allowsWaitlist,
      onlineUrl: input.onlineUrl,
      address: input.address,
      responsibleName: input.responsibleName,
      responsibleEmail: input.responsibleEmail,
      createdByGlobalUserId: input.userId,
      certificateEnabled: input.certificateEnabled,
      workloadHours: input.workloadHours,
      certificateDescription: input.certificateDescription,
      deletedAt: null,
    };
    const eventResult = Event.create({ id: Identifier.fromExisting(this.idGenerator.next()), props, createdAt: now, updatedAt: now });
    if (eventResult.isFailure) return Result.fail(eventResult.error);
    const event = await this.eventRepository.create({
      event: eventResult.value,
      lots: input.lots.map((lot) => ({ ...lot, id: this.idGenerator.next() })),
      fields: input.fields.map((field) => ({ ...field, id: this.idGenerator.next() })),
      activities: input.activities.map((activity) => ({ ...activity, id: this.idGenerator.next() })),
    });
    await this.auditRepository.write({
      userId: input.userId, userName: input.userName, action: "event.created", entity: "event", recordId: event.id,
      beforeData: null, afterData: { title: event.props.title, status: event.props.status }, ip: input.ip,
    });
    return Result.ok(event);
  }
}
