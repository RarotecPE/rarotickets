export type CancelRegistrationInputDto = {
  registrationId?: string | null;
  code?: string | null;
  reason: string;
  actorUserId?: string | null;
  actorName?: string | null;
  isAdministrative?: boolean;
  ip?: string | null;
};
