import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { Participant } from '../../../../domain/entities/participant.entity';
import { ParticipantRepository } from '../../../../domain/repositories/participant-repository.base';
import type {
  ListParticipantsResult,
  ParticipantFilter,
  ParticipantId,
} from '../../../../domain/repositories/participant-repository.interface';
import { ParticipantPersistenceMapper } from '../mappers/participant-persistence.mapper';
import type { ParticipantModel } from '../models/participant.model';

export type ParticipantRepositoryDependencies = { db: IDatabaseClient; mapper: ParticipantPersistenceMapper };

const COLUMNS = `id, name, cpf, cnpj, email, phone, birth_date, company, job_title, city, state,
  created_at, updated_at`;

const FILTERS = `($1::text IS NULL OR lower(name) LIKE $1 OR lower(email) LIKE $1 OR cpf LIKE $1 OR lower(coalesce(company, '')) LIKE $1)
  AND ($2::text IS NULL OR city = $2)
  AND ($3::text IS NULL OR state = $3)
  AND ($4::text IS NULL OR company = $4)`;

export class ParticipantRepositoryImpl extends ParticipantRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: ParticipantPersistenceMapper;

  constructor(dependencies: ParticipantRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  private buildFilterParams(params: ParticipantFilter): unknown[] {
    return [
      params.search ? `%${params.search.toLowerCase()}%` : null,
      params.city,
      params.state,
      params.company,
    ];
  }

  async findById(id: ParticipantId): Promise<Participant | null> {
    const record = await this.db.queryOne<ParticipantModel>({
      sql: `SELECT ${COLUMNS} FROM participants WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByCpf(cpf: string): Promise<Participant | null> {
    const record = await this.db.queryOne<ParticipantModel>({
      sql: `SELECT ${COLUMNS} FROM participants WHERE cpf = $1`,
      params: [cpf],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByEmail(email: string): Promise<Participant | null> {
    const record = await this.db.queryOne<ParticipantModel>({
      sql: `SELECT ${COLUMNS} FROM participants WHERE lower(email) = lower($1)`,
      params: [email ?? ''],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async search(params: ParticipantFilter): Promise<ListParticipantsResult> {
    const filterParams = this.buildFilterParams(params);
    const offset = (params.page - 1) * params.perPage;

    const records = await this.db.query<ParticipantModel>({
      sql: `SELECT ${COLUMNS} FROM participants WHERE ${FILTERS}
            ORDER BY name ASC LIMIT $5 OFFSET $6`,
      params: [...filterParams, params.perPage, offset],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM participants WHERE ${FILTERS}`,
      params: filterParams,
    });

    return {
      participants: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async save(participant: Participant): Promise<void> {
    const data = this.mapper.toPersistence({ entity: participant });
    await this.db.execute({
      sql: `INSERT INTO participants (id, name, cpf, cnpj, email, phone, birth_date, company,
              job_title, city, state, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      params: [
        data.id, data.name, data.cpf, data.cnpj, data.email, data.phone, data.birth_date,
        data.company, data.job_title, data.city, data.state, data.created_at, data.updated_at,
      ],
    });
  }

  async update(participant: Participant): Promise<void> {
    const data = this.mapper.toPersistence({ entity: participant });
    await this.db.execute({
      sql: `UPDATE participants SET name = $2, cpf = $3, cnpj = $4, email = $5, phone = $6,
              birth_date = $7, company = $8, job_title = $9, city = $10, state = $11, updated_at = $12
            WHERE id = $1`,
      params: [
        data.id, data.name, data.cpf, data.cnpj, data.email, data.phone, data.birth_date,
        data.company, data.job_title, data.city, data.state, data.updated_at,
      ],
    });
  }
}
