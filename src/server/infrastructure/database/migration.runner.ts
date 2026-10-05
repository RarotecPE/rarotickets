import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IDatabaseClient } from './database.client';

export type MigrationFile = { name: string; sql: string; checksum: string };
export type RunMigrationsParams = { client: IDatabaseClient; migrationsDir: string; logger: (message: string) => void };

export type RunMigrationsResult = { applied: string[]; skipped: string[] };

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name         text PRIMARY KEY,
    checksum     text        NOT NULL,
    executed_at  timestamptz NOT NULL DEFAULT now()
  )
`;

export async function runMigrations(params: RunMigrationsParams): Promise<RunMigrationsResult> {
  const { client, migrationsDir, logger } = params;
  await client.execute({ sql: CREATE_MIGRATIONS_TABLE });

  const files = await loadMigrationFiles(migrationsDir);
  const executed = await client.query<{ name: string; checksum: string }>({
    sql: 'SELECT name, checksum FROM schema_migrations',
  });
  const executedMap = new Map(executed.map((row) => [row.name, row.checksum]));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const previousChecksum = executedMap.get(file.name);
    if (previousChecksum) {
      if (previousChecksum !== file.checksum) {
        throw new Error(
          `Migration "${file.name}" foi alterada depois de aplicada. Crie um novo arquivo de migration.`,
        );
      }
      skipped.push(file.name);
      continue;
    }

    await client.transaction(async (connection) => {
      await connection.query({ sql: file.sql });
      await connection.query({
        sql: 'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
        params: [file.name, file.checksum],
      });
    });
    applied.push(file.name);
    logger(`[migrations] aplicada: ${file.name}`);
  }

  return { applied, skipped };
}

export async function loadMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir);
  const sqlFiles = entries.filter((entry) => entry.endsWith('.sql')).sort();

  return Promise.all(
    sqlFiles.map(async (name) => {
      const content = await readFile(path.join(migrationsDir, name), 'utf8');
      return {
        name,
        sql: content,
        checksum: createHash('sha256').update(content).digest('hex'),
      };
    }),
  );
}
