import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { Result } from '@core/domain/result';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_FORM_REPOSITORY } from '../../../domain/repositories/event-form-repository.interface';
import type { IEventFormRepository } from '../../../domain/repositories/event-form-repository.interface';
import { EVENT_LOTE_REPOSITORY } from '../../../domain/repositories/event-lote-repository.interface';
import type { IEventLoteRepository } from '../../../domain/repositories/event-lote-repository.interface';
import { EVENT_PROGRAM_REPOSITORY } from '../../../domain/repositories/event-program-repository.interface';
import type { IEventProgramRepository } from '../../../domain/repositories/event-program-repository.interface';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { LoteSelectorService } from '../../../domain/services/lote-selector.service';
import { EventMapper } from '../../mappers/event.mapper';
import { REGISTRATION_CONSENTS } from '../../constants/registration-consents.constants';
import type { GetPublicEventInputDto } from './get-public-event.input.dto';
import type { GetPublicEventOutputDto } from './get-public-event.output.dto';

export type GetPublicEventDependencies = {
  eventRepository: IEventRepository;
  loteRepository: IEventLoteRepository;
  formRepository: IEventFormRepository;
  programRepository: IEventProgramRepository;
  loteSelector: LoteSelectorService;
  clock: IClock;
  mapper: EventMapper;
};

/** Detalhe público do evento — nunca expõe eventos em rascunho (§2). */
export class GetPublicEventUseCase extends UseCase<GetPublicEventInputDto, GetPublicEventOutputDto> {
  private readonly dependencies: GetPublicEventDependencies;

  constructor(dependencies: GetPublicEventDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetPublicEventInputDto): Promise<Result<GetPublicEventOutputDto>> {
    const { eventRepository, loteRepository, formRepository, programRepository, clock, mapper } = this.dependencies;

    const event = await eventRepository.findBySlug(input.slug);
    if (!event) return Result.fail(new EventNotFoundError({ slug: input.slug }));

    const now = clock.now();
    if (!event.status.isPubliclyVisible()) {
      return Result.fail(new EventNotFoundError({ slug: input.slug }));
    }

    const eventId = event.id.toString();
    const [usage, lotes, formFields, speakers, activities] = await Promise.all([
      eventRepository.getSeatUsage(eventId),
      loteRepository.listByEvent({ eventId, includeInactive: false }),
      formRepository.listByEvent({ eventId, includeInactive: false }),
      programRepository.listSpeakers(eventId),
      programRepository.listActivities(eventId),
    ]);

    const currentLote = event.type.isPaid()
      ? this.dependencies.loteSelector.execute({ lotes, at: now })
      : null;

    const snapshotUsage = usage ?? {
      eventId,
      capacity: event.capacity.value,
      occupiedSeats: 0,
      reservedSeats: 0,
      waitlistCount: 0,
      availableSeats: event.capacity.value,
    };

    const speakerById = new Map(speakers.map((speaker) => [speaker.id.toString(), speaker.name]));

    return Result.ok({
      event: mapper.map({ event, includeDescription: true }),
      seatUsage: mapper.mapSeatUsage({ usage: snapshotUsage }),
      lotes: lotes.map((lote) => mapper.mapLote({ lote })),
      currentLote: currentLote?.isSuccess ? mapper.mapLote({ lote: currentLote.value.lote }) : null,
      formFields: formFields.filter((field) => field.isActive).map((field) => mapper.mapFormField({ field })),
      speakers: speakers.map((speaker) => mapper.mapSpeaker({ speaker })),
      activities: activities.map((activity) =>
        mapper.mapActivity({
          activity,
          speakerName: activity.speakerId ? speakerById.get(activity.speakerId) ?? null : null,
        }),
      ),
      consents: REGISTRATION_CONSENTS.map((consent) => ({
        type: consent.type,
        version: consent.version,
        required: consent.required,
      })),
      isRegistrationOpen:
        event.status.value === 'INSCRICOES_ABERTAS' &&
        event.registrationWindow.isOpenAt(now) &&
        (snapshotUsage.availableSeats > 0 || event.waitlistSettings.enabled),
      waitlistEnabled: event.waitlistSettings.enabled,
    });
  }
}
