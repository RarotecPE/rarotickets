import { mkdir } from 'node:fs/promises';
import EmbeddedPostgres from 'embedded-postgres';
import type { DatabaseConfig } from '@server/config/app.config';

export type EmbeddedDatabaseParams = { config: DatabaseConfig; logger: (message: string) => void };

let instance: EmbeddedPostgres | null = null;

/** Verifica se já existe um PostgreSQL escutando na porta configurada. */
async function isPortInUse(port: number): Promise<boolean> {
  const net = await import('node:net');
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** Encerra o cluster embarcado (usado por scripts de linha de comando). */
export async function stopEmbeddedDatabase(): Promise<void> {
  if (!instance) return;
  try {
    await instance.stop();
  } finally {
    instance = null;
  }
}

/**
 * Sobe um PostgreSQL embarcado para o ambiente de desenvolvimento — o driver
 * usado pela aplicação continua sendo o `pg` padrão, apontando para esta porta.
 * Jamais deve ser habilitado em produção (validado na configuração).
 */
export async function startEmbeddedDatabase(params: EmbeddedDatabaseParams): Promise<void> {
  if (instance) return;

  const { config, logger } = params;

  if (await isPortInUse(config.embeddedPort)) {
    logger(`[embedded-postgres] Cluster já em execução na porta ${config.embeddedPort}.`);
    return;
  }

  await mkdir(config.embeddedDataDir, { recursive: true });

  const database = new EmbeddedPostgres({
    databaseDir: config.embeddedDataDir,
    port: config.embeddedPort,
    user: config.embeddedUser,
    password: config.embeddedPassword,
    persistent: true,
    authMethod: 'password',
    onLog: (message) => logger(`[embedded-postgres] ${message.trim()}`),
    onError: (message) => logger(`[embedded-postgres:erro] ${String(message)}`),
  });

  const alreadyInitialised = await isClusterInitialised(config.embeddedDataDir);
  if (!alreadyInitialised) await database.initialise();

  await database.start();

  try {
    await database.createDatabase(config.embeddedDatabase);
  } catch (error) {
    // Banco já existente: cenário esperado em reexecuções.
    if (!String(error).includes('already exists')) throw error;
  }

  instance = database;

  const shutdown = (): void => {
    void database.stop().catch(() => undefined);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('exit', shutdown);
}

async function isClusterInitialised(dataDir: string): Promise<boolean> {
  const { access } = await import('node:fs/promises');
  try {
    await access(`${dataDir}/PG_VERSION`);
    return true;
  } catch {
    return false;
  }
}
