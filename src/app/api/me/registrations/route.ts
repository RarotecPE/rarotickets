import { NextResponse } from "next/server";
import { ParticipantRepo, RegistrationRepo, EventRepo } from "@/server/db/repositories";
import { Email, Document } from "@/lib/domain/value-objects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const doc = url.searchParams.get("document")?.trim() ?? "";
  const docClean = doc.replace(/\D/g, "");
  const kind = docClean.length === 11 ? "CPF" : "PASSAPORTE";

  const emailResult = Email.create(email);
  if (emailResult.isFailure) return NextResponse.json({ error: { message: "Email inválido" } }, { status: 400 });
  const docResult = Document.create(kind, docClean.length === 11 ? docClean : doc);
  if (docResult.isFailure) return NextResponse.json({ error: { message: "Documento inválido" } }, { status: 400 });

  const participant = await ParticipantRepo.findByEmail(emailResult.value.value);
  if (!participant || participant.document.value !== docResult.value.value) {
    return NextResponse.json({ data: [] });
  }
  const regs = await RegistrationRepo.listByParticipant(participant.id.toString());
  const out = [];
  for (const r of regs) {
    const ev = await EventRepo.findById(r.eventId);
    if (!ev) continue;
    ev.autoEvaluateByTime(new Date());
    out.push({
      id: r.id.toString(),
      code: r.code,
      status: r.status,
      finalPriceCents: r.finalPrice.cents,
      confirmedAt: r.confirmedAt,
      qrPayload: (r as any).props.credentialQrPayload ?? null,
      event: {
        id: ev.id.toString(),
        title: ev.title,
        startsAt: ev.dateRange.startsAt,
        endsAt: ev.dateRange.endsAt,
        modality: ev.modality,
        status: ev.status,
        streamUrl: ev.status === "EM_ANDAMENTO" ? ev.streamUrl : null,
      },
    });
  }
  return NextResponse.json({ data: out });
}
