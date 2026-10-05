export type PaymentAdminListQuery = {
  eventId?: string;
  participantId?: string;
  status?: string;
  method?: string;
  search?: string;
  page?: string;
  perPage?: string;
};

export type PaymentActionRequest =
  | {
      action: 'initiate';
      registrationId?: string | null;
      registrationCode?: string | null;
      body: { method?: string; installments?: number };
    }
  | { action: 'byRegistration'; registrationId: string }
  | { action: 'detail'; paymentId?: string | null; reference?: string | null };

export type PaymentAdminActionRequest =
  | { action: 'list'; query: PaymentAdminListQuery }
  | { action: 'detail'; paymentId: string }
  | { action: 'refund'; paymentId: string; body: { reason?: string; amountCents?: number | null } }
  | { action: 'cancel'; paymentId: string; body: { reason?: string } }
  | { action: 'reconcile'; body: { windowHours?: number; limit?: number } }
  | { action: 'simulate'; paymentId: string };

export type PaymentWebhookRequest = {
  payload: unknown;
  rawBody: string;
  signature: string | null;
};
