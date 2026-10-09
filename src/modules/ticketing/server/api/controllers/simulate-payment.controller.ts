import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";
import type { NormalizedPaymentStatus } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import { isJsonRecord, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { readEnvironment } from "@/server/config/environment.config";

export type SimulatePaymentDependencies = { useCase: ProcessPaymentWebhookUseCase };
export type SimulatePaymentStatus = "pago" | "recusado" | "cancelado";

export class SimulatePaymentController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: ProcessPaymentWebhookUseCase;
  constructor(dependencies: SimulatePaymentDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const environment = readEnvironment();
    if (process.env.NODE_ENV === "production" || environment.paymentGateway !== "mock") return jsonError({ code: "MOCK_PAYMENT_DISABLED", message: "Simulação de pagamento indisponível.", status: 404 });
    try {
      const body: unknown = await request.json().catch(() => null);
      const parsed = parseMockPayment(body);
      if (!parsed) return jsonError({ code: "INVALID_MOCK_PAYMENT", message: "Informe uma referência de inscrição e um resultado válido.", status: 400 });
      const eventId = randomUUID();
      const externalId = `mock_${randomUUID()}`;
      const webhook = { eventId, referenceId: parsed.referenceId, externalId, status: parsed.status, amountCents: null, rawPayload: { event_id: eventId, reference_id: parsed.referenceId, id: externalId, status: parsed.status } };
      const result = await this.useCase.execute({ webhook, provider: "mock" });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

function parseMockPayment(value: unknown): { referenceId: string; status: NormalizedPaymentStatus } | null {
  if (!isJsonRecord(value)) return null;
  const referenceId = readText({ value: value.referenceId }).toUpperCase();
  const statusMap: Record<SimulatePaymentStatus, NormalizedPaymentStatus> = { pago: "pago", recusado: "recusado", cancelado: "cancelado" };
  const statusValue = readText({ value: value.status }) as SimulatePaymentStatus;
  if (!/^[A-Z0-9-]{6,40}$/.test(referenceId) || !statusMap[statusValue]) return null;
  return { referenceId, status: statusMap[statusValue] };
}
