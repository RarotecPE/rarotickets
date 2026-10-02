import type { PaymentStatus } from '../../../domain/entities/payment.aggregate.ts';
import type { RegistrationStatus } from '../../../../registration/domain/entities/registration.aggregate.ts';

export type ProcessPaymentNotificationOutputDto = {
  duplicate: boolean;
  paymentStatus: PaymentStatus | null;
  registrationStatus: RegistrationStatus | null;
  registrationConfirmed: boolean;
};
