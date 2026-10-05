import type { EventActivity } from '../entities/event-activity.entity';
import type { EventSpeaker } from '../entities/event-speaker.entity';
import type { IEventProgramRepository } from './event-program-repository.interface';

export abstract class EventProgramRepository implements IEventProgramRepository {
  abstract listSpeakers(eventId: string): Promise<EventSpeaker[]>;
  abstract findSpeakerById(id: string): Promise<EventSpeaker | null>;
  abstract saveSpeaker(speaker: EventSpeaker): Promise<void>;
  abstract listActivities(eventId: string): Promise<EventActivity[]>;
  abstract saveActivity(activity: EventActivity): Promise<void>;
  abstract deleteActivity(id: string): Promise<void>;
}
