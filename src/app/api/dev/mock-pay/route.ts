import { NextResponse } from "next/server";
import { PaymentRepo, RegistrationRepo, EventRepo } from "@/server/db/repositories";
import { mockPagBank } from "@/server/infrastructure/pagbank-mock.adapter";
import { env } from "@/server/config/env";

/**
 * Endpoint de desenvolvimento que simula a confirmação do PagBank.
 * Usado automaticamente pelo adapter Mock quando as credenciais reais
 * não estão preenchidas.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (env.pagbank.token && env.pagbank.token !== "seu-token-pagbank") {
    return NextResponse.json({ error: "Produção" }, { status: 404 });
  }
  const url = new URL(req.url);
  const session = url.searchParams.get("session") ?? "";
  const ref = url.searchParams.get("ref") ?? "";
  const result = await mockPagBank.simulatePaid(session);
  if (result) {
    const payment = await PaymentRepo.findByRegistration(ref);
    if (payment) {
      payment.markPaid("PIX", JSON.stringify({ mock: true, sessionId: session }));
      await PaymentRepo.update(payment);
      const registration = await RegistrationRepo.findById(ref);
      if (registration) {
        registration.markPaid();
        await RegistrationRepo.update(registration);
        await EventRepo.countConfirmed(registration.eventId);
      }
    }
  }
  return NextResponse.redirect(`${env.appBaseUrl}/inscricoes/${ref}/sucesso`);
}
