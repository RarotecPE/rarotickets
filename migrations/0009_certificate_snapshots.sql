-- =============================================================================
-- 0009 — Certificados: snapshots de emissão
-- Regras de negócio: §30 e §31 (certificado com dados do participante/evento
-- congelados no momento da emissão e código público de validação)
-- =============================================================================

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS participant_name   text,
  ADD COLUMN IF NOT EXISTS participant_cpf    text,
  ADD COLUMN IF NOT EXISTS event_title        text,
  ADD COLUMN IF NOT EXISTS activities_summary text,
  ADD COLUMN IF NOT EXISTS validation_url     text;

CREATE INDEX IF NOT EXISTS certificates_status_idx ON certificates (revoked_at) WHERE revoked_at IS NULL;
