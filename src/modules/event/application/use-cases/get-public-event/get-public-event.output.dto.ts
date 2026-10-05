import type {
  EventActivityDto,
  EventFormFieldDto,
  EventLoteDto,
  EventSeatUsageDto,
  EventSpeakerDto,
  EventSummaryDto,
} from '../../mappers/event.mapper';

export type GetPublicEventOutputDto = {
  event: EventSummaryDto;
  seatUsage: EventSeatUsageDto;
  lotes: EventLoteDto[];
  currentLote: EventLoteDto | null;
  formFields: EventFormFieldDto[];
  speakers: EventSpeakerDto[];
  activities: EventActivityDto[];
  consents: { type: string; version: string; required: boolean }[];
  isRegistrationOpen: boolean;
  waitlistEnabled: boolean;
};
