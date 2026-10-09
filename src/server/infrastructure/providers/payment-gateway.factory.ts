import "server-only";
import { readEnvironment } from "@/server/config/environment.config";
import { MockPagBankGateway } from "./mock-pagbank-gateway.provider";
import { PagBankGateway } from "./pagbank-gateway.provider";
import { PaymentGateway } from "./payment-gateway.base";

let singleton: PaymentGateway | undefined;

export function getPaymentGateway(): PaymentGateway {
  if (singleton) return singleton;
  const environment = readEnvironment();
  singleton = environment.paymentGateway === "pagbank" ? new PagBankGateway() : new MockPagBankGateway();
  return singleton;
}
