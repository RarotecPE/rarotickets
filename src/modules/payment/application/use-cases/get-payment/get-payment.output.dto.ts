import type { PaymentDto } from '../../mappers/payment.mapper';

export type PaymentEventDto = {
  type: string;
  fromStatus: string | null;
  toStatus: string;
  providerStatus: string | null;
  description: string;
  actorName: string | null;
  occurredAt: Date;
};

export type GetPaymentOutputDto = {
  payments: PaymentDto[];
  events: PaymentEventDto[];
  registration: {
    registrationId: string;
    code: string;
    status: string;
    seatStatus: string;
    finalAmountCents: number;
    reservationExpiresAt: Date | null;
    waitlistPosition: number | null;
  } | null;
};
