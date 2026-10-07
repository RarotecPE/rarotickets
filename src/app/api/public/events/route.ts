import { NextResponse } from "next/server";
import { EventRepo } from "@/server/db/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await EventRepo.list();
  const now = new Date();
  // Auto-avaliação simples de status antes de retornar
  for (const e of events) {
    const prev = e.status;
    e.autoEvaluateByTime(now);
    if (prev !== e.status) await EventRepo.update(e);
  }
  return NextResponse.json({
    data: events.map((e) => ({
      id: e.id.toString(),
      title: e.title,
      description: e.description,
      modality: e.modality,
      financialType: e.financialType,
      status: e.status,
      startsAt: e.dateRange.startsAt,
      endsAt: e.dateRange.endsAt,
      city: e.city,
      state: e.state,
    })),
  });
}
