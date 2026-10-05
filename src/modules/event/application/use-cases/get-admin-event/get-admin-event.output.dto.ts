import type {
  EventActivityDto,
  EventFormFieldDto,
  EventLoteDto,
  EventSeatUsageDto,
  EventSpeakerDto,
  EventSummaryDto,
} from '../../mappers/event.mapper';

export type GetAdminEventOutputDto = {
  event: EventSummaryDto;
  seatUsage: EventSeatUsageDto;
  lotes: EventLoteDto[];
  formFields: EventFormFieldDto[];
  speakers: EventSpeakerDto[];
  activities: EventActivityDto[];
};
