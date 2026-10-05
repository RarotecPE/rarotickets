export type CertificateModel = {
  id: string;
  registration_id: string;
  event_id: string;
  participant_id: string;
  code: string;
  validation_hash: string;
  workload_hours: string;
  participant_name: string | null;
  participant_cpf: string | null;
  event_title: string | null;
  activities_summary: string | null;
  validation_url: string | null;
  issued_at: Date;
  issued_by: string | null;
  revoked_at: Date | null;
  revoke_reason: string | null;
  created_at: Date;
};
