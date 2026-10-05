import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { EventSeatUsageDto, EventSummaryDto } from '../../mappers/event.mapper';

export type ListedEventDto = EventSummaryDto & {
  seatUsage: EventSeatUsageDto;
  isRegistrationOpen: boolean;
};

export type ListEventsOutputDto = { events: ListedEventDto[]; meta: PaginationMeta };
