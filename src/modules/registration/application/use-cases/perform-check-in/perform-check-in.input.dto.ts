export type PerformCheckInInputDto = {
  /** Credencial lida do QR Code (código + assinatura). */
  credentialToken?: string | null;
  /** Código da inscrição informado manualmente. */
  code?: string | null;
  registrationId?: string | null;
  override?: boolean;
  overrideReason?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
