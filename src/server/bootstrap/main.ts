import path from 'node:path';
import { buildAppConfig } from '@server/config/app.config';
import { initializeDatabase } from '@server/bootstrap/database.bootstrap';
import { createHttpApp } from '@server/bootstrap/http.bootstrap';
import { startPaymentReconciliation, startScheduler } from '@server/bootstrap/scheduler.bootstrap';
import { buildContainer } from '@server/di/container';
import { ConsoleLogger } from '@server/infrastructure/logger/logger';
import { stopEmbeddedDatabase } from '@server/infrastructure/database/embedded-database.provider';
import type { RequestHandler } from 'express';

/**
 * Ponto de entrada: banco (embarcado em dev), container de dependências,
 * Vite em modo middleware (dev) ou SPA compilada (produção) e HTTP em 0.0.0.0.
 */
async function main(): Promise<void> {
  const config = buildAppConfig();
  const logger = new ConsoleLogger({ level: config.logLevel as never, prefix: config.appName });

  const { client } = await initializeDatabase({ config, logger });
  const container = buildContainer({ config, db: client, logger });

  let serveClient: RequestHandler | null = null;
  if (config.isProduction) {
    const clientDir = path.resolve(process.cwd(), 'dist/client');
    const express = (await import('express')).default;
    const staticHandler = express.static(clientDir, { index: false });
    const indexHtml = path.join(clientDir, 'index.html');
    serveClient = ((request, response, next) => {
      if (request.path.startsWith('/api')) return next();
      return staticHandler(request, response, next);
    }) as RequestHandler;
    container.logger.info('Servindo client compilado', { clientDir, indexHtml });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', hmr: { clientPort: 443, protocol: 'wss' } },
      appType: 'spa',
    });
    serveClient = vite.middlewares as unknown as RequestHandler;
    container.logger.info('Vite em modo middleware habilitado (dev).');
  }

  const { app } = createHttpApp({ container, serveClient });

  const scheduler = startScheduler({ container });
  const reconciliation = startPaymentReconciliation({ container });

  const server = app.listen(config.port, '0.0.0.0', () => {
    container.logger.info('RaroTickets no ar', {
      url: `http://0.0.0.0:${config.port}`,
      ambiente: config.nodeEnv,
      provedorPagamento: container.providers.paymentProvider.providerName,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    container.logger.info(`Encerrando aplicação (${signal})...`);
    scheduler.stop();
    reconciliation.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await client.close();
    await stopEmbeddedDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Falha ao iniciar o RaroTickets: ${message}\n`);
  process.exit(1);
});
