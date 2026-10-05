-- =============================================================================
-- 0004 — Inscrições, respostas do formulário, reserva de vaga, check-in
-- Regras de negócio: §3 (vagas), §4 (reserva), §7 (inscrições), §9 (histórico
-- do formulário), §26 (lista de espera), §27 (cancelamento), §29 (check-in)
-- =============================================================================

CREATE TABLE IF NOT EXISTS registrations (
  id                     uuid PRIMARY KEY,
  code                   text        NOT NULL,
  event_id               uuid        NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
  participant_id         uuid        NOT NULL REFERENCES participants (id) ON DELETE RESTRICT,
  lote_id                uuid        REFERENCES event_lotes (id) ON DELETE SET NULL,
  status                 text        NOT NULL,
  -- Situação da vaga permite expirar reservas sem perder o histórico (§4).
  seat_status            text        NOT NULL DEFAULT 'RESERVADA',
  price_cents            integer     NOT NULL DEFAULT 0,
  discount_cents         integer     NOT NULL DEFAULT 0,
  final_amount_cents     integer     NOT NULL DEFAULT 0,
  lote_name              text,
  coupon_id              uuid,
  coupon_code            text,
  is_courtesy            boolean     NOT NULL DEFAULT false,
  courtesy_reason        text,
  payment_method         text,
  waitlist_position      integer,
  reservation_expires_at timestamptz,
  form_version           integer     NOT NULL DEFAULT 1,
  notes                  text,
  confirmed_at           timestamptz,
  cancelled_at           timestamptz,
  cancelled_by           uuid        REFERENCES users (id) ON DELETE SET NULL,
  cancel_reason          text,
  created_by             uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registrations_status_check CHECK (
    status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'CANCELADA', 'LISTA_ESPERA')
  ),
  CONSTRAINT registrations_seat_status_check CHECK (
    seat_status IN ('RESERVADA', 'OCUPADA', 'LIBERADA', 'EXPIRADA')
  ),
  CONSTRAINT registrations_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN ('PIX', 'CREDIT_CARD', 'BOLETO', 'CORTESIA', 'ADMINISTRATIVO')
  ),
  CONSTRAINT registrations_amounts_check CHECK (
    price_cents >= 0 AND discount_cents >= 0 AND final_amount_cents >= 0
    AND discount_cents <= price_cents
  ),
  CONSTRAINT registrations_waitlist_position_check CHECK (waitlist_position IS NULL OR waitlist_position > 0),
  -- Inscrição confirmada sempre possui vaga ocupada.
  CONSTRAINT registrations_confirmed_seat_check CHECK (
    status <> 'CONFIRMADA' OR seat_status = 'OCUPADA'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS registrations_code_unique ON registrations (code);
-- Impede inscrição duplicada ativa do mesmo participante no mesmo evento.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_active_participant_unique
  ON registrations (event_id, participant_id)
  WHERE status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA');
CREATE INDEX IF NOT EXISTS registrations_event_status_idx ON registrations (event_id, status);
CREATE INDEX IF NOT EXISTS registrations_participant_idx ON registrations (participant_id);
CREATE INDEX IF NOT EXISTS registrations_reservation_expires_idx
  ON registrations (reservation_expires_at)
  WHERE seat_status = 'RESERVADA';
CREATE INDEX IF NOT EXISTS registrations_waitlist_idx
  ON registrations (event_id, waitlist_position)
  WHERE status = 'LISTA_ESPERA';

-- Respostas do formulário com snapshot do rótulo/tipo no momento da inscrição:
-- alterações futuras no formulário não destroem o histórico (§9).
CREATE TABLE IF NOT EXISTS registration_answers (
  id              uuid PRIMARY KEY,
  registration_id uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  field_id        uuid        REFERENCES event_form_fields (id) ON DELETE SET NULL,
  field_key       text        NOT NULL,
  field_label     text        NOT NULL,
  field_type      text        NOT NULL,
  value           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS registration_answers_field_unique
  ON registration_answers (registration_id, field_key);
CREATE INDEX IF NOT EXISTS registration_answers_registration_idx ON registration_answers (registration_id);
CREATE INDEX IF NOT EXISTS registration_answers_value_idx ON registration_answers (field_key, value);

-- Check-in único por inscrição (§29). Ajustes administrativos são registrados.
CREATE TABLE IF NOT EXISTS check_ins (
  id              uuid PRIMARY KEY,
  registration_id uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  checked_in_at   timestamptz NOT NULL DEFAULT now(),
  checked_in_by   uuid        REFERENCES users (id) ON DELETE SET NULL,
  operator_name   text,
  method          text        NOT NULL DEFAULT 'QR_CODE',
  is_override     boolean     NOT NULL DEFAULT false,
  override_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_ins_method_check CHECK (method IN ('QR_CODE', 'MANUAL'))
);

CREATE UNIQUE INDEX IF NOT EXISTS check_ins_registration_unique ON check_ins (registration_id);
CREATE INDEX IF NOT EXISTS check_ins_event_idx ON check_ins (event_id);
