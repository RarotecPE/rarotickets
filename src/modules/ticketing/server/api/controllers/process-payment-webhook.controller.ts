import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";
import type { IPaymentGateway } from "@/modules/ticketing/domain/services/payment-gateway.interface";
import { isJsonRecord } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";

export type ProcessPaymentWebhookRequest = { request: NextRequest; provider: "pagbank" | "mock" };
export type ProcessPaymentWebhookDependencies = { useCase: ProcessPaymentWebhookUseCase; gateway: IPaymentGateway };

export class ProcessPaymentWebhookController extends Controller<ProcessPaymentWebhookRequest, NextResponse> {
  private readonly useCase: ProcessPaymentWebhookUseCase;
  private readonly gateway: IPaymentGateway;
  constructor(dependencies: ProcessPaymentWebhookDependencies) {
    super();
    this.useCase = dependencies.useCase;
    this.gateway = dependencies.gateway;
  }
  async handle(input: ProcessPaymentWebhookRequest): Promise<NextResponse> {
    try {
      const rawBody = await input.request.text();
      if (rawBody.length > 256_000) return jsonError({ code: "WEBHOOK_TOO_LARGE", message: "Notificação excede o tamanho permitido.", status: 413 });
      const signature = input.request.headers.get("x-authenticity-token") ?? input.request.headers.get("x-pagbank-signature");
      if (!this.gateway.verifyWebhook({ rawBody, signature })) return jsonError({ code: "WEBHOOK_SIGNATURE_INVALID", message: "Assinatura da notificação inválida.", status: 401 });
      const body: unknown = JSON.parse(rawBody);
      if (!isJsonRecord(body)) return jsonError({ code: "WEBHOOK_PAYLOAD_INVALID", message: "Notificação inválida.", status: 400 });
      const webhook = this.gateway.parseWebhook(body);
      if (!webhook) return jsonError({ code: "WEBHOOK_PAYLOAD_INVALID", message: "Notificação não contém os campos necessários.", status: 400 });
      const result = await this.useCase.execute({ webhook, provider: input.provider });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess({ received: true, ...result.value });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}
