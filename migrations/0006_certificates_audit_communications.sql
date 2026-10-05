-- =============================================================================
-- 0006 — Certificados, auditoria e comunicações
-- Regras de negócio: §30 (certificados), §36 (auditoria), §38 (comunicações)
-- =============================================================================

CREATE TABLE IF NOT EXISTS certificates (
  id               uuid PRIMARY KEY,
  registration_id  uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  event_id         uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  participant_id   uuid        NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  -- Código público de validação, com dígito de verificação, nunca sequencial (§30).
  code             text        NOT NULL,
  validation_hash  text        NOT NULL,
  workload_hours   numeric(5, 1) NOT NULL DEFAULT 0,
  issued_at        timestamptz NOT NULL DEFAULT now(),
  issued_by        uuid        REFERENCES users (id) ON DELETE SET NULL,
  revoked_at       timestamptz,
  revoke_reason    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_registration_unique ON certificates (registration_id);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_unique ON certificates (code);
CREATE INDEX IF NOT EXISTS certificates_event_idx ON certificates (event_id);
CREATE INDEX IF NOT EXISTS certificates_participant_idx ON certificates (participant_id);

-- Trilha de auditoria das operações administrativas sensíveis (§36).
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY,
  actor_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  actor_name    text,
  actor_role    text,
  action        text        NOT NULL,
  entity        text        NOT NULL,
  entity_id     text,
  description   text,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ip            text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

-- Comunicações do ciclo do evento (§38). O envio efetivo é responsabilidade
-- de providers de infraestrutura (e-mail/WhatsApp).
CREATE TABLE IF NOT EXISTS communication_logs (
  id                uuid PRIMARY KEY,
  event_id          uuid        REFERENCES events (id) ON DELETE SET NULL,
  registration_id   uuid        REFERENCES registrations (id) ON DELETE SET NULL,
  participant_id    uuid        REFERENCES participants (id) ON DELETE SET NULL,
  channel           text        NOT NULL,
  template          text        NOT NULL,
  subject           text,
  content           text        NOT NULL,
  destination       text,
  status            text        NOT NULL DEFAULT 'PENDENTE',
  error_message     text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_logs_channel_check CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  CONSTRAINT communication_logs_status_check CHECK (
    status IN ('PENDENTE', 'ENVIADO', 'FALHA', 'IGNORADO')
  )
);

CREATE INDEX IF NOT EXISTS communication_logs_registration_idx ON communication_logs (registration_id);
CREATE INDEX IF NOT EXISTS communication_logs_event_idx ON communication_logs (event_id, created_at DESC);
