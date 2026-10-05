import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { UserRepository } from '../../../../domain/repositories/user-repository.base';
import type { ListUsersParams, ListUsersResult, UserId } from '../../../../domain/repositories/user-repository.interface';
import type { User } from '../../../../domain/entities/user.entity';
import type { UserEmail } from '../../../../domain/value-objects/user-email.vo';
import { UserPersistenceMapper } from '../mappers/user-persistence.mapper';
import type { UserModel } from '../models/user.model';

export type UserRepositoryDependencies = { db: IDatabaseClient; mapper: UserPersistenceMapper };

const COLUMNS = `id, name, email, password_hash, role, permissions, is_active,
  last_login_at, created_by, created_at, updated_at`;

export class UserRepositoryImpl extends UserRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: UserPersistenceMapper;

  constructor(dependencies: UserRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: UserId): Promise<User | null> {
    const record = await this.db.queryOne<UserModel>({
      sql: `SELECT ${COLUMNS} FROM users WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByEmail(email: UserEmail): Promise<User | null> {
    const record = await this.db.queryOne<UserModel>({
      sql: `SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      params: [email.value],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async existsByEmail(email: UserEmail, ignoreUserId?: UserId): Promise<boolean> {
    const record = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM users
            WHERE lower(email) = lower($1) AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      params: [email.value, ignoreUserId ?? null],
    });
    return Number(record?.total ?? 0) > 0;
  }

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const search = params.search ? `%${params.search.toLowerCase()}%` : null;
    const offset = (params.page - 1) * params.perPage;

    const records = await this.db.query<UserModel>({
      sql: `SELECT ${COLUMNS} FROM users
            WHERE ($1::text IS NULL OR lower(name) LIKE $1 OR lower(email) LIKE $1)
              AND ($2::text IS NULL OR role = $2)
              AND ($3::boolean IS NULL OR is_active = $3)
            ORDER BY name ASC
            LIMIT $4 OFFSET $5`,
      params: [search, params.role, params.isActive, params.perPage, offset],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM users
            WHERE ($1::text IS NULL OR lower(name) LIKE $1 OR lower(email) LIKE $1)
              AND ($2::text IS NULL OR role = $2)
              AND ($3::boolean IS NULL OR is_active = $3)`,
      params: [search, params.role, params.isActive],
    });

    return {
      users: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async save(user: User): Promise<void> {
    const data = this.mapper.toPersistence({ entity: user });
    await this.db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, role, permissions, is_active,
              last_login_at, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      params: [
        data.id, data.name, data.email, data.password_hash, data.role, data.permissions,
        data.is_active, data.last_login_at, data.created_by, data.created_at, data.updated_at,
      ],
    });
  }

  async update(user: User): Promise<void> {
    const data = this.mapper.toPersistence({ entity: user });
    await this.db.execute({
      sql: `UPDATE users SET name = $2, email = $3, password_hash = $4, role = $5,
              permissions = $6, is_active = $7, last_login_at = $8, updated_at = $9
            WHERE id = $1`,
      params: [
        data.id, data.name, data.email, data.password_hash, data.role, data.permissions,
        data.is_active, data.last_login_at, data.updated_at,
      ],
    });
  }
}
