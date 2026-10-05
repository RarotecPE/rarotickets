import { Pool } from 'pg';

/** Limpa os dados operacionais para permitir reexecutar o seed em desenvolvimento. */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55432/rarotickets' });
  const tables = [
    'payment_webhook_logs',
    'payment_events',
    'payments',
    'check_ins',
    'certificates',
    'coupon_usages',
    'registration_answers',
    'participant_consents',
    'registrations',
    'event_activities',
    'event_form_fields',
    'event_speakers',
    'event_lotes',
    'coupons',
    'events',
    'communication_logs',
    'participants',
  ];
  for (const table of tables) {
    await pool.query(`DELETE FROM ${table}`);
  }
  await pool.query('UPDATE coupons SET used_count = 0');
  console.log('dados operacionais removidos (participantes, eventos, inscrições, pagamentos, certificados)');
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
