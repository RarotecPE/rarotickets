/**
 * Job: ativa lotes cuja data de início chegou e desativa lotes cuja data de fim expirou.
 * RN-JOB-03 — executado periodicamente.
 *
 * Uso: npm run jobs:lot-transitions
 */
import "dotenv/config";
import postgres from "postgres";
import { LotRepo, EventRepo } from "../../src/server/db/repositories";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/rarotickets";
const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const activated = await LotRepo.activateDueLots(new Date());
  const deactivated = await LotRepo.deactivateExpiredLots(new Date());

  // Auto-avalia eventos conforme o tempo
  const events = await EventRepo.list();
  for (const ev of events) {
    const before = ev.status;
    ev.autoEvaluateByTime(new Date());
    if (before !== ev.status) await EventRepo.update(ev);
  }

  console.log(`[lot-transitions] ${activated} ativados, ${deactivated} desativados.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
