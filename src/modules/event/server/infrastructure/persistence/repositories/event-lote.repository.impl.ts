import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { EventLote } from '../../../../domain/entities/event-lote.entity';
import { EventLoteRepository } from '../../../../domain/repositories/event-lote-repository.base';
import type {
  EventLoteId,
  ListLotesParams,
} from '../../../../domain/repositories/event-lote-repository.interface';
import { EventLotePersistenceMapper } from '../mappers/event-persistence.mapper';
import type { EventLoteModel } from '../models/event.model';

export type EventLoteRepositoryDependencies = { db: IDatabaseClient; mapper: EventLotePersistenceMapper };

const SELECT_WITH_USAGE = `
  SELECT l.id, l.event_id, l.name, l.description, l.start_date, l.end_date, l.max_quantity,
         l.price_cents, l.is_active, l.order_index, l.created_at, l.updated_at,
         COALESCE(u.sold_quantity, 0) AS sold_quantity
  FROM event_lotes l
  LEFT JOIN event_lote_usage u ON u.lote_id = l.id`;

export class EventLoteRepositoryImpl extends EventLoteRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: EventLotePersistenceMapper;

  constructor(dependencies: EventLoteRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: EventLoteId): Promise<EventLote | null> {
    const record = await this.db.queryOne<EventLoteModel>({
      sql: `${SELECT_WITH_USAGE} WHERE l.id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async listByEvent(params: ListLotesParams): Promise<EventLote[]> {
    const records = await this.db.query<EventLoteModel>({
      sql: `${SELECT_WITH_USAGE}
            WHERE l.event_id = $1 AND ($2::boolean IS TRUE OR l.is_active = true)
            ORDER BY l.start_date ASC, l.order_index ASC`,
      params: [params.eventId, params.includeInactive ?? false],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async save(lote: EventLote): Promise<void> {
    const data = this.mapper.toPersistence({ entity: lote });
    await this.db.execute({
      sql: `INSERT INTO event_lotes (id, event_id, name, description, start_date, end_date,
              max_quantity, price_cents, is_active, order_index, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      params: [
        data.id, data.event_id, data.name, data.description, data.start_date, data.end_date,
        data.max_quantity, data.price_cents, data.is_active, data.order_index, data.created_at, data.updated_at,
      ],
    });
  }

  async update(lote: EventLote): Promise<void> {
    const data = this.mapper.toPersistence({ entity: lote });
    await this.db.execute({
      sql: `UPDATE event_lotes SET name = $2, description = $3, start_date = $4, end_date = $5,
              max_quantity = $6, price_cents = $7, is_active = $8, order_index = $9, updated_at = $10
            WHERE id = $1`,
      params: [
        data.id, data.name, data.description, data.start_date, data.end_date, data.max_quantity,
        data.price_cents, data.is_active, data.order_index, data.updated_at,
      ],
    });
  }
}
