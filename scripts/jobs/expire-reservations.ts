/**
 * Job: expira reservas temporárias de 15 minutos e devolve as vagas ao lote.
 * RN-JOB-02 — executado a cada minuto.
 *
 * Uso: npm run jobs:expire-reservations
 */
import "dotenv/config";
import postgres from "postgres";
import { RegistrationRepo, LotRepo } from "../../src/server/db/repositories";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/rarotickets";
const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const expired = await RegistrationRepo.findExpiredReservations(new Date());
  let count = 0;
  for (const reg of expired) {
    reg.expireReservationIfDue(new Date());
    await RegistrationRepo.update(reg);
    if (reg.lotId) {
      const lot = await LotRepo.findById(reg.lotId);
      if (lot) {
        lot.releaseSpot();
        await LotRepo.update(lot);
      }
    }
    count += 1;
  }
  console.log(`[expire-reservations] ${count} reservas expiradas.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
