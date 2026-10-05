import { UseCase } from '@core/application/use-case.base';
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
import { EventMapper } from '../../mappers/event.mapper';
import type { GetAdminEventInputDto } from './get-admin-event.input.dto';
import type { GetAdminEventOutputDto } from './get-admin-event.output.dto';

export type GetAdminEventDependencies = {
  eventRepository: IEventRepository;
  loteRepository: IEventLoteRepository;
  formRepository: IEventFormRepository;
  programRepository: IEventProgramRepository;
  mapper: EventMapper;
};

export class GetAdminEventUseCase extends UseCase<GetAdminEventInputDto, GetAdminEventOutputDto> {
  private readonly dependencies: GetAdminEventDependencies;

  constructor(dependencies: GetAdminEventDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetAdminEventInputDto): Promise<Result<GetAdminEventOutputDto>> {
    const { eventRepository, loteRepository, formRepository, programRepository, mapper } = this.dependencies;

    const event = await eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));

    const eventId = event.id.toString();
    const [usage, lotes, formFields, speakers, activities] = await Promise.all([
      eventRepository.getSeatUsage(eventId),
      loteRepository.listByEvent({ eventId, includeInactive: true }),
      formRepository.listByEvent({ eventId, includeInactive: true }),
      programRepository.listSpeakers(eventId),
      programRepository.listActivities(eventId),
    ]);

    const speakerById = new Map(speakers.map((speaker) => [speaker.id.toString(), speaker.name]));

    return Result.ok({
      event: mapper.map({ event, includeDescription: true }),
      seatUsage: mapper.mapSeatUsage({
        usage: usage ?? {
          eventId,
          capacity: event.capacity.value,
          occupiedSeats: 0,
          reservedSeats: 0,
          waitlistCount: 0,
          availableSeats: event.capacity.value,
        },
      }),
      lotes: lotes.map((lote) => mapper.mapLote({ lote })),
      formFields: formFields.map((field) => mapper.mapFormField({ field })),
      speakers: speakers.map((speaker) => mapper.mapSpeaker({ speaker })),
      activities: activities.map((activity) =>
        mapper.mapActivity({
          activity,
          speakerName: activity.speakerId ? speakerById.get(activity.speakerId) ?? null : null,
        }),
      ),
    });
  }
}
