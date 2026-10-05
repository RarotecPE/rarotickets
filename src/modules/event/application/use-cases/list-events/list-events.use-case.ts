import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { Result } from '@core/domain/result';
import type { EventStatusValue } from '../../../domain/value-objects/event-status.vo';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { ListEventsInputDto } from './list-events.input.dto';
import type { ListEventsOutputDto } from './list-events.output.dto';

export type ListEventsDependencies = { eventRepository: IEventRepository; clock: IClock; mapper: EventMapper };

export class ListEventsUseCase extends UseCase<ListEventsInputDto, ListEventsOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly clock: IClock;
  private readonly mapper: EventMapper;

  constructor(dependencies: ListEventsDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.clock = dependencies.clock;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ListEventsInputDto): Promise<Result<ListEventsOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const now = this.clock.now();

    const { events, total } = await this.eventRepository.list({
      search: input.search ?? null,
      status: (input.status as EventStatusValue | null) ?? null,
      type: (input.type as 'GRATUITO' | 'PAGO' | null) ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      startDateFrom: input.startDateFrom ? new Date(input.startDateFrom) : null,
      startDateTo: input.startDateTo ? new Date(input.startDateTo) : null,
      onlyPublic: input.onlyPublic ?? false,
      onlyUpcoming: input.onlyUpcoming ?? false,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    const usages = await this.eventRepository.getSeatUsageForEvents(events.map((event) => event.id.toString()));
    const usageByEvent = new Map(usages.map((usage) => [usage.eventId, usage]));

    return Result.ok({
      events: events.map((event) => {
        const usage = usageByEvent.get(event.id.toString()) ?? {
          eventId: event.id.toString(),
          capacity: event.capacity.value,
          occupiedSeats: 0,
          reservedSeats: 0,
          waitlistCount: 0,
          availableSeats: event.capacity.value,
        };
        return {
          ...this.mapper.map({ event }),
          seatUsage: this.mapper.mapSeatUsage({ usage }),
          isRegistrationOpen:
            event.status.value === 'INSCRICOES_ABERTAS' &&
            event.registrationWindow.isOpenAt(now) &&
            usage.availableSeats > 0,
        };
      }),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
