import type { EventActivityDto, EventSpeakerDto } from '../../mappers/event.mapper';

export type ManageEventProgramOutputDto = {
  speaker?: EventSpeakerDto;
  activity?: EventActivityDto;
  removedActivityId?: string;
};
