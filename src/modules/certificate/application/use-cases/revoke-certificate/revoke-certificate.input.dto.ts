export type RevokeCertificateInputDto = {
  certificateId: string;
  reason: string;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
