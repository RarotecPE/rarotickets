import { NextResponse } from "next/server";
import { withAuth } from "@/server/middlewares/guards";
import { EventRepo, AuditLogRepo } from "@/server/db/repositories";
import { AuditLog } from "@/lib/domain/entities";

export const POST = withAuth(async ({ user, req }) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[2]; // api/events/{id}/publish
  const event = await EventRepo.findById(id);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } }, { status: 404 });

  const prev = event.status;
  const r = event.publish();
  if (r.isFailure) return NextResponse.json({ error: { code: (r.error as any).code, message: r.error.message } }, { status: 400 });

  await EventRepo.update(event);
  await AuditLogRepo.log(AuditLog.create({
    userId: user.globalId,
    userEmail: user.email,
    action: "event.publish",
    entity: "Event",
    entityId: id,
    prevState: prev,
    newState: event.status,
  }));

  return NextResponse.json({ data: { status: event.status } });
}, "event.publish");
