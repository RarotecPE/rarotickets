import 'dotenv/config';
import { createApplication } from './bootstrap/create-application';
import { loadAppConfig } from './config/app.config';

const config = loadAppConfig({ environment: process.env, workingDirectory: process.cwd() });
const application = await createApplication({ config });
const server = application.listen(config.port, '0.0.0.0', () => {
  process.stdout.write(`RaroTickets API ouvindo em 0.0.0.0:${config.port}\n`);
});

function stopServer(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
