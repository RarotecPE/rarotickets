import { describe, expect, it, vi, afterEach } from "vitest";
import { PagBankGateway } from "./pagbank-gateway.provider";

describe("PagBankGateway", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses PagBank Order payload with charges and deducts buyer installment interest", () => {
    const gateway = new PagBankGateway();
    const orderPayload = {
      id: "ORDE_7E27D991-4E8D-435B-9F32-2FF4FAF28CC4",
      reference_id: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
      charges: [
        {
          id: "CHAR_F377A0F4-81B6-44C2-9DDB-EFACD000E085",
          reference_id: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
          status: "PAID",
          amount: {
            value: 36042,
            currency: "BRL",
            fees: {
              buyer: {
                interest: {
                  total: 6052,
                  installments: 10,
                },
              },
            },
          },
        },
      ],
    };

    const parsed = gateway.parseWebhook(orderPayload);

    expect(parsed).not.toBeNull();
    expect(parsed?.referenceId).toBe("ba4905e6-4d2d-460c-bf13-c80f2b5cc952");
    expect(parsed?.status).toBe("pago");
    expect(parsed?.amountCents).toBe(29990);
    expect(parsed?.eventId).toBe(
      "CHAR_F377A0F4-81B6-44C2-9DDB-EFACD000E085:PAID",
    );
  });

  it("queries checkout and order status via checkPaymentStatus", async () => {
    vi.stubEnv("PAGBANK_TOKEN", "sandbox-test-token");
    vi.stubEnv("PAGBANK_BASE_URL", "https://sandbox.api.pagseguro.com");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "CHEC_86CF3DB3-01FF-4AF6-9964-F05699CEEBFF",
            reference_id: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
            status: "ACTIVE",
            orders: [{ id: "ORDE_7E27D991-4E8D-435B-9F32-2FF4FAF28CC4" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "ORDE_7E27D991-4E8D-435B-9F32-2FF4FAF28CC4",
            reference_id: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
            charges: [
              {
                id: "CHAR_F377A0F4-81B6-44C2-9DDB-EFACD000E085",
                reference_id: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
                status: "PAID",
                amount: {
                  value: 29990,
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const gateway = new PagBankGateway();
    const result = await gateway.checkPaymentStatus({
      referenceId: "ba4905e6-4d2d-460c-bf13-c80f2b5cc952",
      externalId: "CHEC_86CF3DB3-01FF-4AF6-9964-F05699CEEBFF",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result?.status).toBe("pago");
    expect(result?.amountCents).toBe(29990);
  });
});

