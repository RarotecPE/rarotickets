import { describe, expect, it } from "vitest";
import {
  EventConfigurationDomainService,
  type ValidateEventConfigurationParams,
} from "./event-configuration.domain-service";

const service = new EventConfigurationDomainService();
const eventStartAt = new Date("2026-12-10T12:00:00.000Z");
const eventEndAt = new Date("2026-12-10T18:00:00.000Z");
const registrationStartAt = new Date("2026-11-01T00:00:00.000Z");
const registrationEndAt = new Date("2026-12-10T11:00:00.000Z");

function createConfiguration(
  overrides: Partial<ValidateEventConfigurationParams> = {},
): ValidateEventConfigurationParams {
  return {
    chargeType: "gratuito",
    registrationStartAt,
    registrationEndAt,
    eventStartAt,
    eventEndAt,
    lots: [],
    fields: [],
    activities: [],
    ...overrides,
  };
}

describe("EventConfigurationDomainService", () => {
  it("aceita configuração válida de evento gratuito sem lotes", () => {
    expect(service.execute(createConfiguration()).isSuccess).toBe(true);
  });

  it("exige ao menos um lote para evento pago", () => {
    const result = service.execute(createConfiguration({ chargeType: "pago" }));
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("ao menos um lote");
  });

  it("rejeita lote fora do período de inscrições", () => {
    const result = service.execute(
      createConfiguration({
        chargeType: "pago",
        lots: [
          {
            name: "1º Lote",
            priceCents: 5000,
            maxQuantity: 100,
            startAt: new Date("2026-10-31T23:00:00.000Z"),
            endAt: registrationEndAt,
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("período de inscrições");
  });

  it("rejeita opções repetidas em campos de seleção", () => {
    const result = service.execute(
      createConfiguration({
        fields: [
          {
            label: "Unidade",
            description: null,
            type: "select",
            options: ["Recife", "Recife"],
            displayOrder: 0,
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("sem repetição");
  });

  it("rejeita atividade fora do horário do evento", () => {
    const result = service.execute(
      createConfiguration({
        activities: [
          {
            title: "Abertura",
            speakerName: "Equipe Raro",
            startAt: new Date("2026-12-10T11:00:00.000Z"),
            endAt: new Date("2026-12-10T13:00:00.000Z"),
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("período do evento");
  });

  it("rejeita cupom com código fora do padrão ou duplicado", () => {
    const result = service.execute(
      createConfiguration({
        chargeType: "pago",
        lots: [
          {
            name: "Lote 1",
            priceCents: 10000,
            maxQuantity: 50,
            startAt: registrationStartAt,
            endAt: registrationEndAt,
            coupons: [
              {
                code: "INVALID-CODE!",
                type: "percentual",
                discountValue: 10,
                startAt: registrationStartAt,
                endAt: registrationEndAt,
                active: true,
                allowedEmails: [],
                allowedCpfs: [],
              },
            ],
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("apenas letras e números");
  });

  it("rejeita cupom com datas fora do período do lote", () => {
    const lotStart = new Date("2026-11-05T00:00:00.000Z");
    const lotEnd = new Date("2026-11-20T00:00:00.000Z");
    const result = service.execute(
      createConfiguration({
        chargeType: "pago",
        lots: [
          {
            name: "Lote 1",
            priceCents: 10000,
            maxQuantity: 50,
            startAt: lotStart,
            endAt: lotEnd,
            coupons: [
              {
                code: "PROMO10",
                type: "percentual",
                discountValue: 10,
                startAt: new Date("2026-11-04T23:59:59.000Z"), // before lot
                endAt: lotEnd,
                active: true,
                allowedEmails: [],
                allowedCpfs: [],
              },
            ],
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("estritamente dentro do período de vendas do lote");
  });

  it("rejeita cupom com desconto fixo maior que o valor do lote", () => {
    const lotStart = new Date("2026-11-05T00:00:00.000Z");
    const lotEnd = new Date("2026-11-20T00:00:00.000Z");
    const result = service.execute(
      createConfiguration({
        chargeType: "pago",
        lots: [
          {
            name: "Lote 1",
            priceCents: 5000, // R$ 50,00
            maxQuantity: 50,
            startAt: lotStart,
            endAt: lotEnd,
            coupons: [
              {
                code: "DESCONTOMAIOR",
                type: "valor_fixo",
                discountValue: 6000, // R$ 60,00
                startAt: lotStart,
                endAt: lotEnd,
                active: true,
                allowedEmails: [],
                allowedCpfs: [],
              },
            ],
          },
        ],
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("não pode exceder o valor do lote");
  });
});
