import type { AppConfig } from '@server/config/app.config';
import { PostgresDatabaseClient } from '@server/infrastructure/database/database.client';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { startEmbeddedDatabase } from '@server/infrastructure/database/embedded-database.provider';
import { runMigrations } from '@server/infrastructure/database/migration.runner';
import type { ILogger } from '@server/infrastructure/logger/logger';
import path from 'node:path';

export type InitializeDatabaseParams = { config: AppConfig; logger: ILogger };
export type DatabaseBootstrapResult = { client: IDatabaseClient; migrationsApplied: string[] };

export const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

/**
 * Orquestra a infraestrutura de banco: PostgreSQL embarcado (somente dev),
 * pool de conexões e migrations pendentes.
 */
export async function initializeDatabase(
  params: InitializeDatabaseParams,
): Promise<DatabaseBootstrapResult> {
  const { config, logger } = params;

  if (config.database.embedded) {
    if (config.isProduction) {
      throw new Error('DATABASE_EMBEDDED não pode ser usado em produção.');
    }
    logger.info('Iniciando PostgreSQL embarcado de desenvolvimento...', {
      port: config.database.embeddedPort,
    });
    await startEmbeddedDatabase({
      config: config.database,
      logger: (message) => logger.debug(message),
    });
  }

  const client = new PostgresDatabaseClient({
    connectionString: config.database.url,
    ssl: config.database.ssl,
    poolMax: config.database.poolMax,
    applicationName: config.appName,
  });

  await client.ping();
  logger.info('Conexão com o PostgreSQL estabelecida.');

  let migrationsApplied: string[] = [];
  if (config.database.autoMigrate) {
    const result = await runMigrations({
      client,
      migrationsDir: MIGRATIONS_DIR,
      logger: (message) => logger.info(message),
    });
    migrationsApplied = result.applied;
    logger.info(
      result.applied.length > 0
        ? `Migrations aplicadas: ${result.applied.length}`
        : 'Nenhuma migration pendente.',
    );
  }

  return { client, migrationsApplied };
}
