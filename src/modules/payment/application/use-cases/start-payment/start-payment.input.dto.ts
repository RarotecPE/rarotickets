import type { PaymentMethod } from '../../../../../@core/domain/types/payment.types.ts';
import type { GatewayCustomer } from '../../../domain/services/payment-gateway.interface.ts';

export type StartPaymentInputDto = {
  registrationId: string;
  participantId: string | null;
  actorId: string | null;
  method: PaymentMethod;
  installments: number;
  paymentInstrumentToken: string | null;
  cardBrand: string | null;
  cardLastFourDigits: string | null;
  customer: GatewayCustomer;
};
