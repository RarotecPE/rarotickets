import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { EventFormField } from '../../../../domain/entities/event-form-field.entity';
import { EventFormRepository } from '../../../../domain/repositories/event-form-repository.base';
import type {
  EventFormFieldId,
  ListFormFieldsParams,
} from '../../../../domain/repositories/event-form-repository.interface';
import { EventFormFieldPersistenceMapper } from '../mappers/event-persistence.mapper';
import type { EventFormFieldModel } from '../models/event.model';

export type EventFormRepositoryDependencies = { db: IDatabaseClient; mapper: EventFormFieldPersistenceMapper };

const COLUMNS = `id, event_id, field_key, label, description, field_type, is_required, order_index,
  options, placeholder, is_active, created_at, updated_at`;

export class EventFormRepositoryImpl extends EventFormRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: EventFormFieldPersistenceMapper;

  constructor(dependencies: EventFormRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: EventFormFieldId): Promise<EventFormField | null> {
    const record = await this.db.queryOne<EventFormFieldModel>({
      sql: `SELECT ${COLUMNS} FROM event_form_fields WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByKey(params: { eventId: string; fieldKey: string }): Promise<EventFormField | null> {
    const record = await this.db.queryOne<EventFormFieldModel>({
      sql: `SELECT ${COLUMNS} FROM event_form_fields WHERE event_id = $1 AND field_key = $2`,
      params: [params.eventId, params.fieldKey],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async listByEvent(params: ListFormFieldsParams): Promise<EventFormField[]> {
    const records = await this.db.query<EventFormFieldModel>({
      sql: `SELECT ${COLUMNS} FROM event_form_fields
            WHERE event_id = $1 AND ($2::boolean IS TRUE OR is_active = true)
            ORDER BY order_index ASC, created_at ASC`,
      params: [params.eventId, params.includeInactive ?? false],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async save(field: EventFormField): Promise<void> {
    const data = this.mapper.toPersistence({ entity: field });
    await this.db.execute({
      sql: `INSERT INTO event_form_fields (id, event_id, field_key, label, description, field_type,
              is_required, order_index, options, placeholder, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13)`,
      params: [
        data.id, data.event_id, data.field_key, data.label, data.description, data.field_type,
        data.is_required, data.order_index, JSON.stringify(data.options), data.placeholder, data.is_active,
        data.created_at, data.updated_at,
      ],
    });
  }

  async update(field: EventFormField): Promise<void> {
    const data = this.mapper.toPersistence({ entity: field });
    await this.db.execute({
      sql: `UPDATE event_form_fields SET label = $2, description = $3, field_type = $4, is_required = $5,
              order_index = $6, options = $7::jsonb, placeholder = $8, is_active = $9, updated_at = $10
            WHERE id = $1`,
      params: [
        data.id, data.label, data.description, data.field_type, data.is_required, data.order_index,
        JSON.stringify(data.options), data.placeholder, data.is_active, data.updated_at,
      ],
    });
  }
}
