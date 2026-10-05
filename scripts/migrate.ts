import { buildAppConfig } from '@server/config/app.config';
import { MIGRATIONS_DIR } from '@server/bootstrap/database.bootstrap';
import { runMigrations } from '@server/infrastructure/database/migration.runner';
import { PostgresDatabaseClient } from '@server/infrastructure/database/database.client';
import { ConsoleLogger } from '@server/infrastructure/logger/logger';
import { startEmbeddedDatabase } from '@server/infrastructure/database/embedded-database.provider';

async function main(): Promise<void> {
  const config = buildAppConfig();
  const logger = new ConsoleLogger({ level: 'info', prefix: 'migrate' });

  if (config.database.embedded) {
    await startEmbeddedDatabase({ config: config.database, logger: (message) => logger.debug(message) });
  }

  const client = new PostgresDatabaseClient({
    connectionString: config.database.url,
    ssl: config.database.ssl,
    poolMax: 2,
    applicationName: config.appName,
  });

  try {
    const result = await runMigrations({
      client,
      migrationsDir: MIGRATIONS_DIR,
      logger: (message) => logger.info(message),
    });
    logger.info('Migrations concluídas.', {
      aplicadas: result.applied.length,
      jaExecutadas: result.skipped.length,
    });
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error('[migrate] Falha ao aplicar migrations:', error);
  process.exit(1);
});
