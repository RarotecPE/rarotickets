import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { Coupon } from '../../../../domain/entities/coupon.entity';
import { CouponRepository } from '../../../../domain/repositories/coupon-repository.base';
import type {
  CouponFilter,
  CouponUsageRecord,
  ListCouponsResult,
} from '../../../../domain/repositories/coupon-repository.interface';
import { CouponPersistenceMapper } from '../mappers/coupon-persistence.mapper';
import type { CouponModel, CouponUsageModel } from '../models/coupon.model';

export type CouponRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: CouponPersistenceMapper;
};

const COLUMNS = `id, event_id, code, type, value, max_uses, used_count, start_date, end_date,
  is_active, created_by, created_at, updated_at`;

export class CouponRepositoryImpl extends CouponRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: CouponPersistenceMapper;

  constructor(dependencies: CouponRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: string): Promise<Coupon | null> {
    const record = await this.db.queryOne<CouponModel>({
      sql: `SELECT ${COLUMNS} FROM coupons WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByEventAndCode(params: { eventId: string; code: string }): Promise<Coupon | null> {
    const record = await this.db.queryOne<CouponModel>({
      sql: `SELECT ${COLUMNS} FROM coupons WHERE event_id = $1 AND upper(code) = upper($2)`,
      params: [params.eventId, params.code],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async list(filter: CouponFilter): Promise<ListCouponsResult> {
    const search = filter.search ? `%${filter.search.toLowerCase()}%` : null;
    const filters = `($1::uuid IS NULL OR event_id = $1)
      AND ($2::text IS NULL OR lower(code) LIKE $2)
      AND ($3::boolean IS NULL OR is_active = $3)`;

    const records = await this.db.query<CouponModel>({
      sql: `SELECT ${COLUMNS} FROM coupons WHERE ${filters}
            ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      params: [filter.eventId ?? null, search, filter.isActive ?? null, filter.perPage, (filter.page - 1) * filter.perPage],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM coupons WHERE ${filters}`,
      params: [filter.eventId ?? null, search, filter.isActive ?? null],
    });

    return {
      coupons: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listByEvent(eventId: string): Promise<Coupon[]> {
    const records = await this.db.query<CouponModel>({
      sql: `SELECT ${COLUMNS} FROM coupons WHERE event_id = $1 ORDER BY created_at DESC`,
      params: [eventId],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async save(coupon: Coupon): Promise<void> {
    const data = this.mapper.toPersistence({ entity: coupon });
    await this.db.execute({
      sql: `INSERT INTO coupons (id, event_id, code, type, value, max_uses, used_count, start_date,
              end_date, is_active, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      params: [
        data.id, data.event_id, data.code, data.type, data.value, data.max_uses, data.used_count,
        data.start_date, data.end_date, data.is_active, data.created_by, data.created_at, data.updated_at,
      ],
    });
  }

  async update(coupon: Coupon): Promise<void> {
    const data = this.mapper.toPersistence({ entity: coupon });
    await this.db.execute({
      sql: `UPDATE coupons SET code = $2, value = $3, max_uses = $4, used_count = $5, start_date = $6,
              end_date = $7, is_active = $8, updated_at = $9
            WHERE id = $1`,
      params: [
        data.id, data.code, data.value, data.max_uses, data.used_count, data.start_date,
        data.end_date, data.is_active, data.updated_at,
      ],
    });
  }

  /** Consumo atômico: o UPDATE condicional é a garantia contra corrida (§25). */
  async consumeUse(params: {
    couponId: string;
    registrationId: string;
    discountCents: number;
    at: Date;
  }): Promise<boolean> {
    const coupon = await this.db.queryOne<CouponModel>({
      sql: `UPDATE coupons SET used_count = used_count + 1, updated_at = $2
            WHERE id = $1 AND is_active = true
              AND (type = 'CORTESIA' OR used_count < max_uses)
            RETURNING ${COLUMNS}`,
      params: [params.couponId, params.at],
    });
    if (!coupon) return false;

    await this.db.execute({
      sql: `INSERT INTO coupon_usages (id, coupon_id, registration_id, discount_cents, created_at, released_at)
            VALUES ($1, $2, $3, $4, $5, NULL)
            ON CONFLICT (registration_id) DO UPDATE
              SET coupon_id = EXCLUDED.coupon_id, discount_cents = EXCLUDED.discount_cents,
                  created_at = EXCLUDED.created_at, released_at = NULL`,
      params: [generateUuid(), params.couponId, params.registrationId, params.discountCents, params.at],
    });

    return true;
  }

  async releaseUse(params: { registrationId: string }): Promise<boolean> {
    const usage = await this.db.queryOne<CouponUsageModel>({
      sql: `UPDATE coupon_usages SET released_at = now()
            WHERE registration_id = $1 AND released_at IS NULL
            RETURNING *`,
      params: [params.registrationId],
    });
    if (!usage) return false;

    await this.db.execute({
      sql: `UPDATE coupons SET used_count = greatest(used_count - 1, 0), updated_at = now()
            WHERE id = $1 AND type <> 'CORTESIA'`,
      params: [usage.coupon_id],
    });
    return true;
  }

  async findUsageByRegistration(registrationId: string): Promise<CouponUsageRecord | null> {
    const usage = await this.db.queryOne<CouponUsageModel>({
      sql: 'SELECT * FROM coupon_usages WHERE registration_id = $1 AND released_at IS NULL',
      params: [registrationId],
    });
    if (!usage) return null;
    return {
      couponId: usage.coupon_id,
      registrationId: usage.registration_id,
      discountCents: usage.discount_cents,
      createdAt: new Date(usage.created_at),
      releasedAt: usage.released_at ? new Date(usage.released_at) : null,
    };
  }
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
