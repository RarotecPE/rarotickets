import { Pool, types } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';

// O tipo DATE do PostgreSQL é devolvido como string 'YYYY-MM-DD', evitando
// deslocamento de fuso ao converter para Date (regras de negócio usam UTC).
types.setTypeParser(1082, (value: string) => value);

export type SqlParams = unknown[];

export type DatabaseQueryParams = {
  sql: string;
  params?: SqlParams;
};

/** Contrato de acesso ao banco usado pelos repositórios da infraestrutura. */
export interface IDatabaseConnection {
  query<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row[]>;
  queryOne<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row | null>;
  execute(params: DatabaseQueryParams): Promise<number>;
}

export interface IDatabaseClient extends IDatabaseConnection {
  transaction<T>(handler: (connection: IDatabaseConnection) => Promise<T>): Promise<T>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export type DatabaseClientOptions = {
  connectionString: string;
  ssl: boolean;
  poolMax: number;
  applicationName: string;
};

/** Conexão compartilhada (pool) do PostgreSQL. */
export class PostgresDatabaseClient implements IDatabaseClient {
  private readonly pool: Pool;

  constructor(options: DatabaseClientOptions) {
    this.pool = new Pool({
      connectionString: options.connectionString,
      max: options.poolMax,
      ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
      application_name: options.applicationName,
    });
  }

  public async query<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row[]> {
    const result = await this.pool.query<Row>(params.sql, params.params ?? []);
    return result.rows;
  }

  public async queryOne<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row | null> {
    const rows = await this.query<Row>(params);
    return rows[0] ?? null;
  }

  public async execute(params: DatabaseQueryParams): Promise<number> {
    const result = await this.pool.query(params.sql, params.params ?? []);
    return result.rowCount ?? 0;
  }

  public async transaction<T>(handler: (connection: IDatabaseConnection) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const connection = createConnectionFromClient(client);
      const result = await handler(connection);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

function createConnectionFromClient(client: PoolClient): IDatabaseConnection {
  return {
    async query<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row[]> {
      const result = await client.query<Row>(params.sql, params.params ?? []);
      return result.rows;
    },
    async queryOne<Row extends QueryResultRow>(params: DatabaseQueryParams): Promise<Row | null> {
      const result = await client.query<Row>(params.sql, params.params ?? []);
      return result.rows[0] ?? null;
    },
    async execute(params: DatabaseQueryParams): Promise<number> {
      const result = await client.query(params.sql, params.params ?? []);
      return result.rowCount ?? 0;
    },
  };
}
