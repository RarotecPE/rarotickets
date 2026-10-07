import { NextResponse } from "next/server";
import { PaymentRepo, RegistrationRepo, ParticipantRepo } from "@/server/db/repositories";
import { paymentGateway } from "@/server/infrastructure/pagbank.adapter";
import { env } from "@/server/config/env";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await PaymentRepo.findByRegistration(id);
  if (!payment) {
    // pode ser que o id seja do pagamento; busca por id do payment
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pagamento não encontrado" } }, { status: 404 });
  }
  const registration = await RegistrationRepo.findById(payment.registrationId);
  if (!registration) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  const participant = await ParticipantRepo.findById(registration.participantId);
  if (!participant) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const session = await paymentGateway.createCheckoutSession({
    referenceId: registration.id.toString(),
    amountCents: payment.amount.cents,
    description: `Inscrição — RaroTickets`,
    customer: {
      name: participant.name.value,
      email: participant.email.value,
      document: participant.document.value,
    },
    returnUrlSuccess: `${env.appBaseUrl}/inscricoes/${registration.id}/sucesso`,
    returnUrlFailure: `${env.appBaseUrl}/inscricoes/${registration.id}/pagamento`,
    webhookUrl: `${env.appBaseUrl}/api/payments/webhooks/pagbank`,
  });
  payment.attachGatewayOrder(session.sessionId);
  await PaymentRepo.update(payment);

  return NextResponse.json({
    data: {
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      lightboxId: session.lightboxId,
      publicKey: env.pagbank.publicKey,
      sandbox: env.pagbank.env === "sandbox",
      appBaseUrl: env.appBaseUrl,
    },
  });
}
