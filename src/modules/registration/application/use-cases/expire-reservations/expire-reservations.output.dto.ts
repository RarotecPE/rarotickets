export type ExpireReservationsOutputDto = {
  expired: Array<{ registrationId: string; code: string; eventId: string }>;
};
