import EmbeddedPostgres from 'embedded-postgres';

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: '/tmp/rarotickets-pgdata',
    port: 55432,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
    authMethod: 'password',
    onLog: (message: string) => console.log('[pg]', message),
  });
  console.log('iniciando...', new Date().toISOString());
  await pg.start();
  console.log('start OK', new Date().toISOString());
  try {
    await pg.createDatabase('rarotickets');
    console.log('database criado');
  } catch (error) {
    console.log('createDatabase:', error instanceof Error ? error.message : error);
  }
  const client = pg.getPgClient();
  await client.connect();
  const result = await client.query('select version()');
  console.log('versão:', result.rows[0]);
  await client.end();
  await pg.stop();
  console.log('parado');
}

main().catch((error) => { console.error('FALHA', error); process.exit(1); });
