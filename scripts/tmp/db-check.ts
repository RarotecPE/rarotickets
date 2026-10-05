import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55432/rarotickets' });
  const counts = await pool.query(`SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM events) AS events,
    (SELECT COUNT(*) FROM registrations) AS registrations,
    (SELECT COUNT(*) FROM payments) AS payments`);
  console.log(counts.rows[0]);
  const events = await pool.query('SELECT id, title, status FROM events ORDER BY created_at');
  console.log(events.rows);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

export {};
