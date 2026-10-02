import type { PaymentInstructions, PaymentSnapshot } from '../../../domain/entities/payment.aggregate.ts';
import type { RegistrationStatus } from '../../../../registration/domain/entities/registration.aggregate.ts';

export type StartPaymentOutputDto = {
  payment: PaymentSnapshot;
  instructions: PaymentInstructions;
  registrationStatus: RegistrationStatus;
  registrationConfirmed: boolean;
  communicationQueued: boolean;
};
