-- RaroTickets — Schema inicial
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (perfis ligados ao RaroNexus)
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36) PRIMARY KEY,
  global_id       VARCHAR(64)  NOT NULL,
  name            VARCHAR(160) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  avatar_url      TEXT,
  role            VARCHAR(32)  NOT NULL DEFAULT 'CONSULTA',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_global_id_unique ON users(global_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique  ON users(email);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id                          VARCHAR(36) PRIMARY KEY,
  title                       VARCHAR(200) NOT NULL,
  description                 TEXT NOT NULL,
  modality                    VARCHAR(16)  NOT NULL,
  financial_type              VARCHAR(16)  NOT NULL,
  status                      VARCHAR(32)  NOT NULL DEFAULT 'RASCUNHO',
  starts_at                   TIMESTAMPTZ  NOT NULL,
  ends_at                     TIMESTAMPTZ  NOT NULL,
  capacity                    INTEGER      NOT NULL,
  address                     TEXT,
  city                        VARCHAR(120),
  state                       VARCHAR(2),
  stream_url                  TEXT,
  manager_id                  VARCHAR(64)  NOT NULL,
  certificate_enabled         BOOLEAN      NOT NULL DEFAULT false,
  certificate_hours           INTEGER,
  certificate_min_presence_percent INTEGER DEFAULT 100,
  waitlist_enabled            BOOLEAN      NOT NULL DEFAULT true,
  canceled_at                 TIMESTAMPTZ,
  cancel_reason               TEXT,
  published_at                TIMESTAMPTZ,
  custom_form_fields          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_status_idx  ON events(status);
CREATE INDEX IF NOT EXISTS events_manager_idx ON events(manager_id);
CREATE INDEX IF NOT EXISTS events_starts_idx  ON events(starts_at);

-- Lots
CREATE TABLE IF NOT EXISTS lots (
  id              VARCHAR(36) PRIMARY KEY,
  event_id        VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  price_cents     INTEGER NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  total_spots     INTEGER NOT NULL,
  spots_taken     INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lots_event_idx         ON lots(event_id);
CREATE INDEX IF NOT EXISTS lots_active_range_idx  ON lots(active, starts_at, ends_at);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id                VARCHAR(36) PRIMARY KEY,
  name              VARCHAR(160) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  document_kind     VARCHAR(16)  NOT NULL,
  document_value    VARCHAR(32)  NOT NULL,
  phone             VARCHAR(20),
  company           VARCHAR(200),
  role              VARCHAR(120),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_document_unique ON participants(document_kind, document_value);
CREATE INDEX IF NOT EXISTS participants_email_idx ON participants(email);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id            VARCHAR(36) PRIMARY KEY,
  code          VARCHAR(32) NOT NULL,
  type          VARCHAR(16) NOT NULL,
  value         INTEGER NOT NULL,
  event_id      VARCHAR(36) REFERENCES events(id) ON DELETE SET NULL,
  max_uses      INTEGER,
  uses          INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  valid_until   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON coupons(code);

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id                          VARCHAR(36) PRIMARY KEY,
  code                        VARCHAR(32) NOT NULL,
  event_id                    VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id              VARCHAR(36) NOT NULL REFERENCES participants(id),
  lot_id                      VARCHAR(36) REFERENCES lots(id),
  status                      VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
  contracted_price_cents      INTEGER NOT NULL DEFAULT 0,
  discount_amount_cents       INTEGER NOT NULL DEFAULT 0,
  final_price_cents           INTEGER NOT NULL DEFAULT 0,
  coupon_id                   VARCHAR(36) REFERENCES coupons(id),
  answers                     JSONB NOT NULL DEFAULT '[]'::jsonb,
  consent_terms               BOOLEAN NOT NULL DEFAULT true,
  consent_marketing           BOOLEAN NOT NULL DEFAULT false,
  reservation_expires_at      TIMESTAMPTZ,
  waitlist_position           INTEGER,
  cancellation_reason         VARCHAR(64),
  canceled_at                 TIMESTAMPTZ,
  confirmed_at                TIMESTAMPTZ,
  credential_token            VARCHAR(64),
  credential_qr_payload       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS registrations_code_unique             ON registrations(code);
CREATE INDEX IF NOT EXISTS registrations_event_idx                    ON registrations(event_id);
CREATE INDEX IF NOT EXISTS registrations_participant_idx              ON registrations(participant_id);
CREATE INDEX IF NOT EXISTS registrations_status_idx                   ON registrations(status);
CREATE INDEX IF NOT EXISTS registrations_reservation_idx              ON registrations(reservation_expires_at);
CREATE INDEX IF NOT EXISTS registrations_credential_token_idx         ON registrations(credential_token);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id                  VARCHAR(36) PRIMARY KEY,
  registration_id     VARCHAR(36) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  external_reference  VARCHAR(64) NOT NULL,
  gateway_order_id    VARCHAR(128),
  amount_cents        INTEGER NOT NULL,
  status              VARCHAR(32) NOT NULL DEFAULT 'CRIADO',
  method              VARCHAR(16),
  payload_raw         TEXT,
  paid_at             TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_registration_idx   ON payments(registration_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_external_ref_unique ON payments(external_reference);
CREATE INDEX IF NOT EXISTS payments_gateway_idx        ON payments(gateway_order_id);

-- Check-ins
CREATE TABLE IF NOT EXISTS check_ins (
  id                VARCHAR(36) PRIMARY KEY,
  registration_id   VARCHAR(36) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id          VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status            VARCHAR(16) NOT NULL DEFAULT 'NAO_REALIZADO',
  checked_in_at     TIMESTAMPTZ,
  operator_id       VARCHAR(64),
  operator_name     VARCHAR(160),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS checkins_registration_unique ON check_ins(registration_id);
CREATE INDEX IF NOT EXISTS checkins_event_idx ON check_ins(event_id);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id                 VARCHAR(36) PRIMARY KEY,
  registration_id    VARCHAR(36) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id           VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_name   VARCHAR(160) NOT NULL,
  event_title        VARCHAR(200) NOT NULL,
  hours              INTEGER NOT NULL,
  code               VARCHAR(32) NOT NULL,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_registration_unique ON certificates(registration_id);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_unique         ON certificates(code);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  user_email    VARCHAR(255),
  ip            VARCHAR(64),
  action        VARCHAR(120) NOT NULL,
  entity        VARCHAR(64) NOT NULL,
  entity_id     VARCHAR(64) NOT NULL,
  prev_state    TEXT,
  new_state     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx  ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_user_idx    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at);

-- Webhooks recebidos (auditoria)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id           VARCHAR(36) PRIMARY KEY,
  provider     VARCHAR(32) NOT NULL,
  external_id  VARCHAR(128),
  raw_payload  TEXT NOT NULL,
  processed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhooks_provider_ext_idx ON payment_webhooks(provider, external_id);
