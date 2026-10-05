-- =============================================================================
-- 0003 — Eventos, lotes, palestrantes, programação e formulário de inscrição
-- Regras de negócio: §2 (eventos), §5 (lotes), §8/§9 (formulário), §31 (programação)
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id                              uuid PRIMARY KEY,
  slug                            text        NOT NULL,
  title                           text        NOT NULL,
  summary                         text        NOT NULL,
  description                     text        NOT NULL,
  image_url                       text,
  start_date                      date        NOT NULL,
  end_date                        date        NOT NULL,
  start_time                      time        NOT NULL,
  end_time                        time        NOT NULL,
  is_online                       boolean     NOT NULL DEFAULT false,
  online_url                      text,
  venue_name                      text,
  address                         text,
  city                            text,
  state                           text,
  capacity                        integer     NOT NULL,
  registration_start              timestamptz NOT NULL,
  registration_end                timestamptz NOT NULL,
  responsible_name                text        NOT NULL,
  responsible_email               text,
  workload_hours                  numeric(5, 1) NOT NULL DEFAULT 0,
  type                            text        NOT NULL,
  status                          text        NOT NULL DEFAULT 'RASCUNHO',
  certificate_enabled             boolean     NOT NULL DEFAULT false,
  certificate_text                text,
  certificate_template            text,
  certificate_requires_attendance boolean     NOT NULL DEFAULT true,
  certificate_min_attendance_pct  integer     NOT NULL DEFAULT 100,
  waitlist_enabled                boolean     NOT NULL DEFAULT false,
  seat_reservation_minutes        integer     NOT NULL DEFAULT 15,
  max_installments                integer     NOT NULL DEFAULT 1,
  allow_pix                       boolean     NOT NULL DEFAULT true,
  allow_boleto                    boolean     NOT NULL DEFAULT true,
  allow_credit_card               boolean     NOT NULL DEFAULT true,
  min_installment_cents           integer     NOT NULL DEFAULT 500,
  form_version                    integer     NOT NULL DEFAULT 1,
  created_by                      uuid        REFERENCES users (id) ON DELETE SET NULL,
  published_at                    timestamptz,
  cancelled_at                    timestamptz,
  cancel_reason                   text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_type_check CHECK (type IN ('GRATUITO', 'PAGO')),
  CONSTRAINT events_status_check CHECK (
    status IN ('RASCUNHO', 'AGENDADO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS',
               'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO')
  ),
  CONSTRAINT events_capacity_check CHECK (capacity > 0),
  CONSTRAINT events_period_check CHECK (end_date >= start_date),
  CONSTRAINT events_registration_window_check CHECK (registration_end > registration_start),
  CONSTRAINT events_online_url_check CHECK (is_online = false OR online_url IS NOT NULL),
  CONSTRAINT events_workload_check CHECK (workload_hours >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events (slug);
CREATE INDEX IF NOT EXISTS events_status_idx ON events (status);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events (start_date);
CREATE INDEX IF NOT EXISTS events_registration_window_idx ON events (registration_start, registration_end);

-- Lotes (§5): identificados automaticamente por período, quantidade e situação.
CREATE TABLE IF NOT EXISTS event_lotes (
  id            uuid PRIMARY KEY,
  event_id      uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  start_date    timestamptz NOT NULL,
  end_date      timestamptz NOT NULL,
  max_quantity  integer     NOT NULL,
  price_cents   integer     NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  order_index   integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_lotes_period_check CHECK (end_date > start_date),
  CONSTRAINT event_lotes_max_quantity_check CHECK (max_quantity > 0),
  CONSTRAINT event_lotes_price_check CHECK (price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS event_lotes_event_idx ON event_lotes (event_id, order_index);
CREATE INDEX IF NOT EXISTS event_lotes_window_idx ON event_lotes (event_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS event_speakers (
  id           uuid PRIMARY KEY,
  event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name         text        NOT NULL,
  bio          text,
  photo_url    text,
  institution  text,
  order_index  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_speakers_event_idx ON event_speakers (event_id, order_index);

CREATE TABLE IF NOT EXISTS event_activities (
  id          uuid PRIMARY KEY,
  event_id    uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  speaker_id  uuid        REFERENCES event_speakers (id) ON DELETE SET NULL,
  title       text        NOT NULL,
  description text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  room        text,
  order_index integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_activities_period_check CHECK (end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS event_activities_event_idx ON event_activities (event_id, start_at);

-- Formulário configurável por evento (§8). Campos nunca são apagados
-- fisicamente: são inativados para preservar respostas antigas (§9).
CREATE TABLE IF NOT EXISTS event_form_fields (
  id           uuid PRIMARY KEY,
  event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  field_key    text        NOT NULL,
  label        text        NOT NULL,
  description  text,
  field_type   text        NOT NULL,
  is_required  boolean     NOT NULL DEFAULT false,
  order_index  integer     NOT NULL DEFAULT 0,
  options      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  placeholder  text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_form_fields_type_check CHECK (
    field_type IN ('TEXTO', 'TEXTO_LONGO', 'NUMERO', 'DATA', 'EMAIL', 'TELEFONE',
                   'CPF', 'CNPJ', 'SELECAO', 'ESCOLHA_UNICA', 'MULTIPLA_ESCOLHA',
                   'SIM_NAO', 'ARQUIVO')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS event_form_fields_key_unique ON event_form_fields (event_id, field_key);
CREATE INDEX IF NOT EXISTS event_form_fields_order_idx ON event_form_fields (event_id, order_index);
