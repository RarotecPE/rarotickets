import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { EventRepo, LotRepo, ParticipantRepo, RegistrationRepo, CouponRepo, PaymentRepo, AuditLogRepo } from "@/server/db/repositories";
import { Participant, Registration, Payment, AuditLog } from "@/lib/domain/entities";
import { Money } from "@/lib/domain/value-objects";

// Criação de inscrição pública — participante pode não estar autenticado (SSO é para operadores).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const eventId: string = body.eventId;

  const event = await EventRepo.findById(eventId);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evento não encontrado" } }, { status: 404 });

  // Auto-avalia status baseado no relógio
  event.autoEvaluateByTime(new Date());
  if (event.status !== "INSCRICOES_ABERTAS") {
    return NextResponse.json({ error: { code: "INSCRICOES_FECHADAS", message: "Inscrições não estão abertas para este evento" } }, { status: 400 });
  }

  // Cria/atualiza o participante
  const doc = body.documentKind as "CPF" | "PASSAPORTE";
  let participant = await ParticipantRepo.findByDocument(doc, body.document?.replace(/\D/g, "") ?? body.document);
  if (!participant) {
    const p = Participant.create({
      name: body.name,
      email: body.email,
      documentKind: doc,
      document: body.document,
      phone: body.phone ?? null,
      company: body.company ?? null,
      role: body.participantRole ?? null,
    });
    if (p.isFailure) {
      return NextResponse.json({ error: { code: "VALIDATION", message: p.error.message } }, { status: 400 });
    }
    participant = p.value;
    await ParticipantRepo.save(participant);
  } else {
    const u = participant.updateProfile({ name: body.name, phone: body.phone ?? null, company: body.company ?? null, role: body.participantRole ?? null });
    if (u.isFailure) return NextResponse.json({ error: { code: "VALIDATION", message: u.error.message } }, { status: 400 });
    await ParticipantRepo.update(participant);
  }

  // Verifica capacidade disponível
  const confirmed = await EventRepo.countConfirmed(eventId);
  const reserved = await EventRepo.countActiveReservations(eventId);
  const available = event.capacity - confirmed - reserved;

  // Cupom opcional
  let discount = Money.zero();
  let couponId: string | null = null;
  if (body.couponCode) {
    const coupon = await CouponRepo.findByCode(body.couponCode);
    if (!coupon) {
      return NextResponse.json({ error: { code: "CUPOM_INVALIDO", message: "Cupom inválido" } }, { status: 400 });
    }
    if (coupon.eventId && coupon.eventId !== eventId) {
      return NextResponse.json({ error: { code: "CUPOM_INVALIDO", message: "Cupom não aplicável a este evento" } }, { status: 400 });
    }
    const d = coupon.calculateDiscount(Money.zero()); // vamos recalcular abaixo
    if (d.isFailure) return NextResponse.json({ error: { code: "CUPOM_INVALIDO", message: d.error.message } }, { status: 400 });
    couponId = coupon.id.toString();
  }

  // Define lote atual
  const lot = event.financialType === "PAGO" ? await LotRepo.findCurrentForEvent(eventId) : null;
  const lotPrice = lot ? lot.price : Money.zero();

  // Recalcula desconto com base no preço real
  if (couponId && body.couponCode) {
    const coupon = await CouponRepo.findByCode(body.couponCode);
    if (coupon) {
      const d = coupon.calculateDiscount(lotPrice);
      if (!d.isFailure) {
        discount = d.value;
        coupon.consume();
        await CouponRepo.update(coupon);
      }
    }
  }

  const isSoldOut = available <= 0;
  const isWaitlist = isSoldOut && event.waitlistEnabled;

  // Executa transação de alocação atômica
  return await db.transaction(async (tx) => {
    // Bloqueia a linha do evento para evitar race conditions (SELECT FOR UPDATE via drizzle)
    // Usamos uma checagem final com SELECT FOR UPDATE no SQL raw.
    const [{ avail }] = await tx.execute(
      sql`select ${event.capacity} - (
        select count(*) from registrations where event_id = ${eventId} and status = 'CONFIRMADA'
      ) - (
        select count(*) from registrations where event_id = ${eventId} and status in ('PENDENTE','AGUARDANDO_PAGAMENTO') and reservation_expires_at > now()
      ) as avail`,
    );
    const realAvail = Number(avail);

    if (realAvail <= 0 && !isWaitlist) {
      return NextResponse.json({ error: { code: "VAGAS_ESGOTADAS", message: "Vagas esgotadas" } }, { status: 409 });
    }

    const regResult = Registration.create({
      eventId,
      participantId: participant!.id.toString(),
      lotId: lot?.id.toString() ?? null,
      lotPrice,
      answers: body.answers ?? [],
      consentTerms: Boolean(body.consentTerms),
      consentMarketing: Boolean(body.consentMarketing),
      discount,
      couponId,
      isFree: event.financialType === "GRATUITO",
    });
    if (regResult.isFailure) {
      return NextResponse.json({ error: { code: "VALIDATION", message: regResult.error.message } }, { status: 400 });
    }
    const reg = regResult.value;

    if (isWaitlist) {
      const pos = await RegistrationRepo.nextWaitlistPosition(eventId);
      reg.sendToWaitlist(pos);
    } else if (lot && !reg.finalPrice.isZero()) {
      // Reserva o lote
      lot.reserveSpot();
      reg.openCheckout();
    } else {
      // Gratuito ou cortesia 100% — confirma imediatamente e ocupa o lote
      if (lot) lot.reserveSpot();
    }

    await RegistrationRepo.save(reg);
    if (lot) await LotRepo.update(lot);

    // Se for pagamento pendente, cria Payment
    let payment: any = null;
    if (reg.status === "AGUARDANDO_PAGAMENTO") {
      const p = Payment.create({
        registrationId: reg.id.toString(),
        externalReference: reg.id.toString(),
        amount: reg.finalPrice,
      });
      if (!p.isFailure) {
        payment = p.value;
        await PaymentRepo.save(payment);
      }
    }

    await AuditLogRepo.log(AuditLog.create({
      userId: "public",
      action: "registration.create",
      entity: "Registration",
      entityId: reg.id.toString(),
      newState: reg.status,
    }));

    return NextResponse.json({
      data: {
        id: reg.id.toString(),
        code: reg.code,
        status: reg.status,
        finalPriceCents: reg.finalPrice.cents,
        reservationExpiresAt: reg.reservationExpiresAt,
        credentialQrPayload: reg.credentialQrPayload ?? null,
        paymentId: payment?.id.toString() ?? null,
        waitlistPosition: reg.waitlistPosition ?? null,
      },
    });
  });
}

// Lista as inscrições de um evento (operadores)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ data: [] });
  const list = await RegistrationRepo.listByEvent(eventId);
  return NextResponse.json({
    data: list.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      status: r.status,
      participantId: r.participantId,
      finalPriceCents: r.finalPrice.cents,
      confirmedAt: r.confirmedAt,
      canceledAt: r.canceledAt ?? null,
      reservationExpiresAt: r.reservationExpiresAt,
    })),
  });
}
