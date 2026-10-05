export type RegistrationStatusSnapshot = {
  registrationId: string;
  code: string;
  eventId: string;
  participantId: string;
  status: string;
  seatStatus: string;
  finalAmountCents: number;
  reservationExpiresAt: Date | null;
  waitlistPosition: number | null;
  isCourtesy: boolean;
  hasCheckedIn: boolean;
  checkedInAt: Date | null;
  confirmedAt: Date | null;
};

export type ConfirmRegistrationResult =
  | { status: 'CONFIRMED' }
  | { status: 'ALREADY_CONFIRMED' }
  | { status: 'WAITLISTED'; position: number }
  | { status: 'SEAT_UNAVAILABLE' }
  | { status: 'CANCELLED_REQUIRES_REVIEW'; message: string }
  | { status: 'NOT_FOUND' };

export type ConfirmRegistrationAfterPaymentParams = {
  registrationId: string;
  paymentMethod: string;
  at: Date;
  /** Reserva de vaga criada durante a confirmação, quando aplicável (§4). */
  reservationMinutes?: number;
};

export type ExpirePaymentReservationParams = {
  registrationId: string;
  at: Date;
  reason: string;
};

/** ACL do contexto de inscrições usado pelo contexto de pagamentos. */
export interface IRegistrationGateway {
  getSnapshot(params: { registrationId: string }): Promise<RegistrationStatusSnapshot | null>;
  /** Marca a inscrição como aguardando pagamento e ajusta a reserva de vaga (§11). */
  markAwaitingPayment(params: {
    registrationId: string;
    paymentMethod: string;
    at: Date;
    reservationExpiresAt: Date | null;
  }): Promise<{ status: 'UPDATED' | 'IGNORED' | 'NOT_FOUND' }>;
  confirmAfterPayment(params: ConfirmRegistrationAfterPaymentParams): Promise<ConfirmRegistrationResult>;
  markPaymentFailed(params: { registrationId: string; reason: string; at: Date }): Promise<void>;
  expireReservation(params: ExpirePaymentReservationParams): Promise<void>;
}

export const REGISTRATION_GATEWAY = Symbol('IRegistrationGateway');
