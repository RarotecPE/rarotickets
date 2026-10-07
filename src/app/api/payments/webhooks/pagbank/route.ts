import { NextResponse } from "next/server";
import { PaymentRepo, RegistrationRepo, LotRepo, EventRepo, AuditLogRepo } from "@/server/db/repositories";
import { paymentGateway } from "@/server/infrastructure/pagbank.adapter";
import { AuditLog } from "@/lib/domain/entities";
import { db } from "@/server/db";
import { paymentWebhooks } from "@/server/db/schema";
import { Identifier } from "@/@core/domain/identifier";

// Idempotente: armazena payload bruto e processa apenas uma vez.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headersObj = Object.fromEntries(req.headers.entries());
  const notification = await paymentGateway.parseWebhook({ rawBody, headers: headersObj });

  // Armazena notificação para auditoria, de qualquer forma.
  await db.insert(paymentWebhooks).values({
    id: Identifier.create().toString(),
    provider: "pagbank",
    externalId: notification?.gatewayOrderId ?? null,
    rawPayload: rawBody,
    processed: false,
  });

  if (!notification) {
    // Em sandbox/mock ou payload inválido, responde 200 mas não processa.
    return NextResponse.json({ received: true });
  }

  await db.transaction(async (tx) => {
    void tx;
    const payment = await PaymentRepo.findByGatewayOrderId(notification.gatewayOrderId);
    if (!payment) return;
    if (payment.status === "PAGO") return; // idempotente

    const registration = await RegistrationRepo.findById(payment.registrationId);
    if (!registration) return;
    const event = await EventRepo.findById(registration.eventId);
    if (!event) return;

    switch (notification.status) {
      case "PAID":
      case "AUTHORIZED_AND_CAPTURED": {
        // Se a inscrição já expirou e não há vaga, marca estorno necessário
        const confirmed = await EventRepo.countConfirmed(registration.eventId);
        const reserved = await EventRepo.countActiveReservations(registration.eventId);
        const hasSpot = event.capacity - confirmed > 0 || registration.confirmedAt;
        if (!hasSpot && registration.status !== "CONFIRMADA") {
          payment.needsRefund();
          await registration.cancel("PAGAMENTO_TARDIO_SEM_VAGA");
          await RegistrationRepo.update(registration);
        } else {
          payment.markPaid("PIX", notification.rawPayload);
          registration.markPaid();
          await RegistrationRepo.update(registration);
        }
        break;
      }
      case "DECLINED":
      case "REJECTED":
        payment.markDeclined(notification.rawPayload);
        break;
      case "CANCELED":
        payment.markCanceled(notification.rawPayload);
        await registration.cancel("PAGAMENTO_RECUSADO");
        if (registration.lotId) {
          const lot = await LotRepo.findById(registration.lotId);
          if (lot) { lot.releaseSpot(); await LotRepo.update(lot); }
        }
        await RegistrationRepo.update(registration);
        break;
      case "EXPIRED":
        payment.markExpired(notification.rawPayload);
        await registration.cancel("TIMEOUT_RESERVA");
        if (registration.lotId) {
          const lot = await LotRepo.findById(registration.lotId);
          if (lot) { lot.releaseSpot(); await LotRepo.update(lot); }
        }
        await RegistrationRepo.update(registration);
        break;
      case "REFUNDED":
        payment.markRefunded();
        break;
      default:
        break;
    }
    await PaymentRepo.update(payment);

    await AuditLogRepo.log(AuditLog.create({
      userId: "webhook-pagbank",
      action: "payment.webhook",
      entity: "Payment",
      entityId: payment.id.toString(),
      newState: notification.status,
    }));
  });

  return NextResponse.json({ received: true });
}
