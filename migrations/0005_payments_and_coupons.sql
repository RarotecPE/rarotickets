-- =============================================================================
-- 0005 — Cupons, pagamentos, histórico financeiro e notificações do PagBank
-- Regras de negócio: §12 a §25 (pagamentos, cupons, cortesias),
-- §18 (duplicidade), §20 (idempotência), §40 (histórico financeiro)
-- =============================================================================

CREATE TABLE IF NOT EXISTS coupons (
  id           uuid PRIMARY KEY,
  event_id     uuid        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  code         text        NOT NULL,
  type         text        NOT NULL,
  -- PERCENTUAL: value = percentual (0-100). VALOR_FIXO: value = reais.
  -- CORTESIA: value ignorado (inscrição sem cobrança).
  value        numeric(10, 2) NOT NULL DEFAULT 0,
  max_uses     integer     NOT NULL,
  used_count   integer     NOT NULL DEFAULT 0,
  start_date   timestamptz NOT NULL,
  end_date     timestamptz NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_type_check CHECK (type IN ('PERCENTUAL', 'VALOR_FIXO', 'CORTESIA')),
  CONSTRAINT coupons_value_check CHECK (value >= 0 AND (type <> 'PERCENTUAL' OR value <= 100)),
  CONSTRAINT coupons_max_uses_check CHECK (max_uses > 0),
  CONSTRAINT coupons_used_count_check CHECK (used_count >= 0 AND used_count <= max_uses),
  CONSTRAINT coupons_period_check CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_event_code_unique ON coupons (event_id, upper(code));
CREATE INDEX IF NOT EXISTS coupons_event_idx ON coupons (event_id);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id              uuid PRIMARY KEY,
  coupon_id       uuid        NOT NULL REFERENCES coupons (id) ON DELETE RESTRICT,
  registration_id uuid        NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
  discount_cents  integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_registration_unique ON coupon_usages (registration_id);
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_idx ON coupon_usages (coupon_id);

CREATE TABLE IF NOT EXISTS payments (
  id                        uuid PRIMARY KEY,
  registration_id           uuid        NOT NULL REFERENCES registrations (id) ON DELETE RESTRICT,
  event_id                  uuid        NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
  method                    text        NOT NULL,
  status                    text        NOT NULL,
  amount_cents              integer     NOT NULL,
  installments              integer     NOT NULL DEFAULT 1,
  installment_amount_cents  integer     NOT NULL DEFAULT 0,
  card_brand                text,
  card_last4                text,
  -- Referência interna que preserva o vínculo evento → inscrição → pagamento (§13).
  reference                 text        NOT NULL,
  pagbank_charge_id         text,
  pagbank_order_id          text,
  pix_qr_code               text,
  pix_copy_paste            text,
  pix_expires_at            timestamptz,
  boleto_barcode            text,
  boleto_due_date           date,
  paid_at                   timestamptz,
  cancelled_at              timestamptz,
  cancel_reason             text,
  refunded_cents            integer     NOT NULL DEFAULT 0,
  expires_at                timestamptz,
  created_by                uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_method_check CHECK (method IN ('PIX', 'CREDIT_CARD', 'BOLETO', 'CORTESIA')),
  CONSTRAINT payments_status_check CHECK (
    status IN ('PENDENTE', 'AGUARDANDO', 'PAGO', 'RECUSADO', 'CANCELADO', 'EXPIRADO', 'ESTORNADO')
  ),
  CONSTRAINT payments_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT payments_installments_check CHECK (installments >= 1),
  -- Nunca armazenar dados sensíveis do cartão: apenas bandeira e 4 dígitos (§17).
  CONSTRAINT payments_card_last4_check CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_unique ON payments (reference);
CREATE INDEX IF NOT EXISTS payments_registration_idx ON payments (registration_id);
CREATE INDEX IF NOT EXISTS payments_event_status_idx ON payments (event_id, status);
CREATE INDEX IF NOT EXISTS payments_pagbank_charge_idx ON payments (pagbank_charge_id);
CREATE INDEX IF NOT EXISTS payments_reconcile_idx ON payments (status, created_at)
  WHERE status IN ('PENDENTE', 'AGUARDANDO');
-- Uma única cobrança ativa por inscrição evita duplicidade por clique repetido (§18).
CREATE UNIQUE INDEX IF NOT EXISTS payments_active_unique
  ON payments (registration_id)
  WHERE status IN ('PENDENTE', 'AGUARDANDO');

-- Histórico financeiro imutável: nenhuma operação substitui o histórico (§40).
CREATE TABLE IF NOT EXISTS payment_events (
  id            uuid PRIMARY KEY,
  payment_id    uuid        NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  status_from   text,
  status_to     text,
  amount_cents  integer,
  actor_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  actor_name    text,
  reason        text,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_type_check CHECK (
    event_type IN ('COBRANCA_CRIADA', 'STATUS_ALTERADO', 'CANCELAMENTO_SOLICITADO',
                   'CANCELAMENTO_CONFIRMADO', 'ESTORNO_SOLICITADO', 'ESTORNO_CONFIRMADO',
                   'NOTIFICACAO_RECEBIDA', 'RECONCILIACAO')
  )
);

CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON payment_events (payment_id, created_at);

-- Notificações do PagBank processadas de forma idempotente (§20).
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id                uuid PRIMARY KEY,
  provider          text        NOT NULL DEFAULT 'PAGBANK',
  notification_id   text        NOT NULL,
  event_type        text,
  pagbank_charge_id text,
  reference         text,
  payload           jsonb       NOT NULL,
  signature_valid   boolean     NOT NULL DEFAULT false,
  status            text        NOT NULL DEFAULT 'RECEBIDO',
  error_message     text,
  attempts          integer     NOT NULL DEFAULT 1,
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_webhook_logs_status_check CHECK (
    status IN ('RECEBIDO', 'PROCESSADO', 'DUPLICADO', 'IGNORADO', 'FALHA')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_logs_idempotency_unique
  ON payment_webhook_logs (provider, notification_id);
CREATE INDEX IF NOT EXISTS payment_webhook_logs_charge_idx ON payment_webhook_logs (pagbank_charge_id);
CREATE INDEX IF NOT EXISTS payment_webhook_logs_status_idx ON payment_webhook_logs (status, created_at);
