import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Result } from "@/@core/domain/result";
import { SimulatePaymentController } from "./simulate-payment.controller";
import type { ProcessPaymentWebhookUseCase } from "@/modules/ticketing/application/use-cases/process-payment-webhook/process-payment-webhook.use-case";

describe("SimulatePaymentController", () => {
  it("preserves lowercase UUID referenceId when forwarding mock payment webhook", async () => {
    const executeMock = vi.fn().mockResolvedValue(
      Result.ok({
        duplicate: false,
        registrationCode: "INS-2026-ABCD1234",
        status: "confirmada",
        refundRequired: false,
      }),
    );
    const useCase = {
      execute: executeMock,
    } as unknown as ProcessPaymentWebhookUseCase;

    const controller = new SimulatePaymentController({ useCase });
    const lowercaseUuid = "1ea33b30-169a-4784-b033-77b9c3370c8d";
    const request = new NextRequest("http://localhost:3000/api/mock/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId: lowercaseUuid,
        status: "pago",
      }),
    });

    const response = await controller.handle(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("confirmada");
    expect(payload.data.registrationCode).toBe("INS-2026-ABCD1234");
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock.mock.calls[0]?.[0]?.webhook?.referenceId).toBe(
      lowercaseUuid,
    );
  });

  it("returns 404 when no matching payment exists for referenceId", async () => {
    const executeMock = vi.fn().mockResolvedValue(
      Result.ok({
        duplicate: false,
        registrationCode: null,
        status: null,
        refundRequired: false,
      }),
    );
    const useCase = {
      execute: executeMock,
    } as unknown as ProcessPaymentWebhookUseCase;

    const controller = new SimulatePaymentController({ useCase });
    const request = new NextRequest("http://localhost:3000/api/mock/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId: "1ea33b30-169a-4784-b033-77b9c3370c8d",
        status: "pago",
      }),
    });

    const response = await controller.handle(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error?.code).toBe("PAYMENT_NOT_FOUND");
  });
});
