import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { Event } from '../../../domain/entities/event.entity';
import { EventFormField } from '../../../domain/entities/event-form-field.entity';
import { EventSlugAlreadyInUseError } from '../../../domain/errors/event-slug-already-in-use.error';
import { EVENT_FORM_REPOSITORY } from '../../../domain/repositories/event-form-repository.interface';
import type { IEventFormRepository } from '../../../domain/repositories/event-form-repository.interface';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { CreateEventInputDto } from './create-event.input.dto';
import type { CreateEventOutputDto } from './create-event.output.dto';

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

export type CreateEventDependencies = {
  eventRepository: IEventRepository;
  formRepository: IEventFormRepository;
  auditRecorder: IAuditRecorder;
  mapper: EventMapper;
};

export class CreateEventUseCase extends UseCase<CreateEventInputDto, CreateEventOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly formRepository: IEventFormRepository;
  private readonly auditRecorder: IAuditRecorder;
  private readonly mapper: EventMapper;

  constructor(dependencies: CreateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.formRepository = dependencies.formRepository;
    this.auditRecorder = dependencies.auditRecorder;
    this.mapper = dependencies.mapper;
  }

  async execute(input: CreateEventInputDto): Promise<Result<CreateEventOutputDto>> {
    const createParams = {
      title: input.title,
      summary: input.summary,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      period: {
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
      },
      location: {
        isOnline: input.isOnline,
        onlineUrl: input.onlineUrl ?? null,
        venueName: input.venueName ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
      },
      capacity: input.capacity,
      registrationWindow: { start: input.registrationStart, end: input.registrationEnd },
      responsible: { name: input.responsibleName, email: input.responsibleEmail ?? null },
      workloadHours: input.workloadHours,
      type: input.type,
      certificate: {
        enabled: input.certificateEnabled ?? false,
        text: input.certificateText ?? null,
        requiresAttendance: input.certificateRequiresAttendance ?? true,
      },
      waitlist: { enabled: input.waitlistEnabled ?? false, autoPromote: input.waitlistAutoPromote ?? false },
      payment: {
        seatReservationMinutes: input.seatReservationMinutes ?? 15,
        maxInstallments: input.maxInstallments ?? 1,
        allowPix: input.allowPix ?? true,
        allowBoleto: input.allowBoleto ?? true,
        allowCreditCard: input.allowCreditCard ?? true,
        minInstallmentCents: input.minInstallmentCents ?? 500,
      },
      createdBy: input.actorUserId,
    };

    const eventResult = Event.create(createParams);
    if (eventResult.isFailure) return Result.fail(eventResult.error);
    let event = eventResult.value;

    // O endereço do evento é único: em caso de conflito geramos um sufixo.
    if (await this.eventRepository.existsBySlug(event.slug.value)) {
      const suffixedResult = Event.create({ ...createParams, slugSuffix: randomSuffix() });
      if (suffixedResult.isFailure) return Result.fail(suffixedResult.error);
      event = suffixedResult.value;
      if (await this.eventRepository.existsBySlug(event.slug.value)) {
        return Result.fail(new EventSlugAlreadyInUseError(event.slug.value));
      }
    }

    // O formulário é validado antes de qualquer gravação: um campo inválido não
    // deixa evento pela metade no banco (§5).
    const fieldEntities: EventFormField[] = [];
    for (const [index, field] of (input.formFields ?? []).entries()) {
      const fieldResult = EventFormField.create({
        eventId: event.id.toString(),
        fieldKey: field.fieldKey,
        label: field.label,
        description: field.description ?? null,
        fieldType: field.fieldType,
        isRequired: field.isRequired ?? false,
        orderIndex: field.orderIndex ?? index,
        options: field.options ?? [],
        placeholder: field.placeholder ?? null,
      });
      if (fieldResult.isFailure) return Result.fail(fieldResult.error);
      fieldEntities.push(fieldResult.value);
    }

    await this.eventRepository.save(event);
    for (const field of fieldEntities) {
      await this.formRepository.save(field);
    }

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'EVENT_CREATED',
      entity: 'event',
      entityId: event.id.toString(),
      description: `Evento "${event.title.value}" criado`,
      after: { title: event.title.value, status: event.status.value, capacity: event.capacity.value },
      ip: input.ip ?? null,
    });

    return Result.ok({ event: this.mapper.map({ event, includeDescription: true }) });
  }
}
