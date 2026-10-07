import { NextResponse } from "next/server";
import { withAuth } from "@/server/middlewares/guards";
import { EventRepo } from "@/server/db/repositories";
import { Event } from "@/lib/domain/entities";

export const dynamic = "force-dynamic";

// Lista todos os eventos
export const GET = withAuth(async () => {
  const events = await EventRepo.list();
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
      capacity: e.capacity,
      city: e.city,
      state: e.state,
      managerId: e.managerId,
    })),
  });
});

// Cria novo evento
export const POST = withAuth(async ({ req, user }) => {
  const body = await req.json();
  const result = Event.create({
    title: body.title,
    description: body.description,
    modality: body.modality,
    financialType: body.financialType,
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
    capacity: Number(body.capacity),
    address: body.address ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    streamUrl: body.streamUrl ?? null,
    managerId: user.globalId,
    waitlistEnabled: body.waitlistEnabled ?? true,
    certificateEnabled: body.certificateEnabled ?? false,
    certificateHours: body.certificateHours ?? null,
  });
  if (result.isFailure) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: result.error.message } },
      { status: 400 },
    );
  }
  await EventRepo.save(result.value);
  return NextResponse.json({ data: { id: result.value.id.toString() } }, { status: 201 });
}, "event.create");
