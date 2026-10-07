import { NextResponse } from "next/server";
import { withAuth } from "@/server/middlewares/guards";
import { LotRepo, EventRepo } from "@/server/db/repositories";
import { Lot } from "@/lib/domain/entities";

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req }) => {
  const url = new URL(req.url);
  const eventId = url.pathname.split("/")[3];
  const event = await EventRepo.findById(eventId);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } }, { status: 404 });

  const body = await req.json();
  const result = Lot.create({
    eventId,
    name: body.name,
    priceCents: Number(body.priceCents ?? 0),
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
    totalSpots: Number(body.totalSpots),
  });
  if (result.isFailure) {
    return NextResponse.json({ error: { code: "VALIDATION", message: result.error.message } }, { status: 400 });
  }
  await LotRepo.save(result.value);
  return NextResponse.json({ data: { id: result.value.id.toString() } }, { status: 201 });
}, "lot.manage");
