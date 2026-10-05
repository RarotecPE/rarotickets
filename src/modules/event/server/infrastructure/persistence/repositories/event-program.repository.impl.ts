import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { EventActivity } from '../../../../domain/entities/event-activity.entity';
import type { EventSpeaker } from '../../../../domain/entities/event-speaker.entity';
import { EventProgramRepository } from '../../../../domain/repositories/event-program-repository.base';
import {
  EventActivityPersistenceMapper,
  EventSpeakerPersistenceMapper,
} from '../mappers/event-persistence.mapper';
import type { EventActivityModel, EventSpeakerModel } from '../models/event.model';

export type EventProgramRepositoryDependencies = {
  db: IDatabaseClient;
  speakerMapper: EventSpeakerPersistenceMapper;
  activityMapper: EventActivityPersistenceMapper;
};

export class EventProgramRepositoryImpl extends EventProgramRepository {
  private readonly db: IDatabaseClient;
  private readonly speakerMapper: EventSpeakerPersistenceMapper;
  private readonly activityMapper: EventActivityPersistenceMapper;

  constructor(dependencies: EventProgramRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.speakerMapper = dependencies.speakerMapper;
    this.activityMapper = dependencies.activityMapper;
  }

  async listSpeakers(eventId: string): Promise<EventSpeaker[]> {
    const records = await this.db.query<EventSpeakerModel>({
      sql: `SELECT * FROM event_speakers WHERE event_id = $1 ORDER BY order_index ASC, name ASC`,
      params: [eventId],
    });
    return records.map((record) => this.speakerMapper.toDomain({ record }));
  }

  async findSpeakerById(id: string): Promise<EventSpeaker | null> {
    const record = await this.db.queryOne<EventSpeakerModel>({
      sql: 'SELECT * FROM event_speakers WHERE id = $1',
      params: [id],
    });
    return record ? this.speakerMapper.toDomain({ record }) : null;
  }

  async saveSpeaker(speaker: EventSpeaker): Promise<void> {
    const data = this.speakerMapper.toPersistence({ entity: speaker });
    await this.db.execute({
      sql: `INSERT INTO event_speakers (id, event_id, name, bio, photo_url, institution, order_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      params: [data.id, data.event_id, data.name, data.bio, data.photo_url, data.institution, data.order_index],
    });
  }

  async listActivities(eventId: string): Promise<EventActivity[]> {
    const records = await this.db.query<EventActivityModel>({
      sql: `SELECT * FROM event_activities WHERE event_id = $1 ORDER BY start_at ASC, order_index ASC`,
      params: [eventId],
    });
    return records.map((record) => this.activityMapper.toDomain({ record }));
  }

  async saveActivity(activity: EventActivity): Promise<void> {
    const data = this.activityMapper.toPersistence({ entity: activity });
    await this.db.execute({
      sql: `INSERT INTO event_activities (id, event_id, speaker_id, title, description, start_at, end_at,
              room, order_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      params: [
        data.id, data.event_id, data.speaker_id, data.title, data.description, data.start_at, data.end_at,
        data.room, data.order_index,
      ],
    });
  }

  async deleteActivity(id: string): Promise<void> {
    await this.db.execute({ sql: 'DELETE FROM event_activities WHERE id = $1', params: [id] });
  }
}
