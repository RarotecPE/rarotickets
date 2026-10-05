import { EventActivity } from '../entities/event-activity.entity';
import { EventSpeaker } from '../entities/event-speaker.entity';

export interface IEventProgramRepository {
  listSpeakers(eventId: string): Promise<EventSpeaker[]>;
  findSpeakerById(id: string): Promise<EventSpeaker | null>;
  saveSpeaker(speaker: EventSpeaker): Promise<void>;
  listActivities(eventId: string): Promise<EventActivity[]>;
  saveActivity(activity: EventActivity): Promise<void>;
  deleteActivity(id: string): Promise<void>;
}

export const EVENT_PROGRAM_REPOSITORY = Symbol('IEventProgramRepository');
