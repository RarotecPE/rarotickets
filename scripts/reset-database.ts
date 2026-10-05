import { buildAppConfig } from '@server/config/app.config';
import { MIGRATIONS_DIR, initializeDatabase } from '@server/bootstrap/database.bootstrap';
import { runMigrations } from '@server/infrastructure/database/migration.runner';
import { ConsoleLogger } from '@server/infrastructure/logger/logger';
import { stopEmbeddedDatabase } from '@server/infrastructure/database/embedded-database.provider';

const logger = new ConsoleLogger({ level: 'info', prefix: 'reset' });

/** Recria o banco de desenvolvimento: apaga o schema público e reaplica migrations. */
async function main(): Promise<void> {
  const config = buildAppConfig();
  if (config.isProduction) throw new Error('O reset é exclusivo de desenvolvimento.');

  const { client } = await initializeDatabase({ config, logger });
  logger.warn('Apagando o schema público do banco de desenvolvimento...');
  await client.execute({ sql: 'DROP SCHEMA public CASCADE' });
  await client.execute({ sql: 'CREATE SCHEMA public' });

  const result = await runMigrations({
    client,
    migrationsDir: MIGRATIONS_DIR,
    logger: (message) => logger.info(message),
  });
  logger.info(`Banco recriado com ${result.applied.length} migration(s).`);
  await client.close();
  await stopEmbeddedDatabase();
}

main().catch(async (error: unknown) => {
  logger.error('Falha ao recriar o banco', { error: error instanceof Error ? error.message : String(error) });
  await stopEmbeddedDatabase();
  process.exit(1);
});
