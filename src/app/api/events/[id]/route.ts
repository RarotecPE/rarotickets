import { NextResponse } from "next/server";
import { EventRepo, LotRepo } from "@/server/db/repositories";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await EventRepo.findById(id);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } }, { status: 404 });

  // Auto-avaliação de status baseada no tempo
  const now = new Date();
  const prevStatus = event.status;
  event.autoEvaluateByTime(now);
  if (prevStatus !== event.status) await EventRepo.update(event);

  const lots = await LotRepo.listByEvent(id);
  const confirmed = await EventRepo.countConfirmed(id);
  const reserved = await EventRepo.countActiveReservations(id);
  const available = Math.max(0, event.capacity - confirmed - reserved);

  return NextResponse.json({
    data: {
      id: event.id.toString(),
      title: event.title,
      description: event.description,
      modality: event.modality,
      financialType: event.financialType,
      status: event.status,
      startsAt: event.dateRange.startsAt,
      endsAt: event.dateRange.endsAt,
      capacity: event.capacity,
      address: event.address,
      city: event.city,
      state: event.state,
      streamUrl: event.status === "EM_ANDAMENTO" ? event.streamUrl : null,
      waitlistEnabled: event.waitlistEnabled,
      certificateEnabled: event.certificateEnabled,
      certificateHours: event.certificateHours,
      customFormFields: event.customFormFields,
      publishedAt: event.publishedAt,
      stats: { confirmed, reserved, available },
      lots: lots.map((l) => ({
        id: l.id.toString(),
        name: l.name,
        priceCents: l.price.cents,
        startsAt: l.dateRange.startsAt,
        endsAt: l.dateRange.endsAt,
        totalSpots: l.totalSpots,
        spotsTaken: l.spotsTaken,
        spotsRemaining: l.spotsRemaining,
        active: l.active,
        isAvailableNow: l.isAvailableNow(new Date()),
      })),
    },
  });
}
