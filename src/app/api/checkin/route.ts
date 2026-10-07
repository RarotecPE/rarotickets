import { NextResponse } from "next/server";
import { withAuth } from "@/server/middlewares/guards";
import { RegistrationRepo, EventRepo, CheckInRepo, AuditLogRepo } from "@/server/db/repositories";
import { CheckIn, AuditLog } from "@/lib/domain/entities";
import type { EventStatus } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export const POST = withAuth(async ({ req, user }) => {
  const body = await req.json();
  const { credentialToken } = body as { credentialToken?: string; registrationId?: string };
  let registration;
  if (credentialToken) {
    registration = await RegistrationRepo.findByCredentialToken(credentialToken);
  } else if (body.registrationId) {
    registration = await RegistrationRepo.findById(body.registrationId);
  }
  if (!registration) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Credencial inválida" } }, { status: 404 });
  const event = await EventRepo.findById(registration.eventId);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  if (registration.status !== "CONFIRMADA") {
    return NextResponse.json({ error: { code: "CHECKIN_INVALIDO", message: "Inscrição não confirmada" } }, { status: 400 });
  }

  event.autoEvaluateByTime(new Date());
  const now = new Date();
  const eventStatus = event.status as EventStatus;
  const eventIsToday = now.toDateString() === event.dateRange.startsAt.toDateString() || eventStatus === "EM_ANDAMENTO";
  if (!eventIsToday) {
    return NextResponse.json({ error: { code: "FORA_PERIODO", message: "Evento fora do período de check-in" } }, { status: 400 });
  }

  let checkin = await CheckInRepo.findByRegistration(registration.id.toString());
  if (checkin && checkin.status === "REALIZADO") {
    return NextResponse.json({ error: { code: "JA_REALIZADO", message: "Check-in já realizado" } }, { status: 409 });
  }
  const isNew = !checkin;
  if (!checkin) {
    checkin = CheckIn.create({ registrationId: registration.id.toString(), eventId: registration.eventId });
  }
  const r = checkin.perform({ operatorId: user.globalId, operatorName: user.name, eventStatus });
  if (r.isFailure) {
    const err = r.error as Error & { code?: string };
    return NextResponse.json({ error: { code: err.code ?? "ERRO", message: err.message } }, { status: 400 });
  }

  if (isNew) {
    await CheckInRepo.save(checkin);
  } else {
    await CheckInRepo.update(checkin);
  }

  await AuditLogRepo.log(AuditLog.create({
    userId: user.globalId,
    userEmail: user.email,
    action: "checkin.perform",
    entity: "CheckIn",
    entityId: checkin.id.toString(),
    newState: "REALIZADO",
  }));

  return NextResponse.json({ data: { ok: true, registrationCode: registration.code } });
}, "checkin.perform");
