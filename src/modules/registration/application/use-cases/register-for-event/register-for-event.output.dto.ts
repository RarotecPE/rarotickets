import type { RegistrationDto } from '../../mappers/registration.mapper';

export type RegisterForEventOutputDto = {
  registration: RegistrationDto;
  participant: { id: string; name: string; email: string };
  event: { id: string; title: string; slug: string; type: string; status: string };
  requiresPayment: boolean;
  waitlisted: boolean;
  paymentOptions: {
    allowPix: boolean;
    allowBoleto: boolean;
    allowCreditCard: boolean;
    maxInstallments: number;
    minInstallmentCents: number;
    reservationExpiresAt: Date | null;
  };
};
