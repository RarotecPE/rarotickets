-- =============================================================================
-- 0008 — Alinhamento do módulo de pagamentos ao domínio
-- Regras de negócio: §16 a §22 (status internos, histórico, webhook, estorno)
-- Adiciona os campos que o domínio de pagamento mantém (provedor, status do
-- provedor, dados de estorno, participante) e amplia o histórico financeiro.
-- =============================================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS participant_id    uuid REFERENCES participants (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_name     text,
  ADD COLUMN IF NOT EXISTS provider_status   text,
  ADD COLUMN IF NOT EXISTS authorization_code text,
  ADD COLUMN IF NOT EXISTS refunded_at       timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason     text,
  ADD COLUMN IF NOT EXISTS failure_reason    text;

CREATE INDEX IF NOT EXISTS payments_participant_idx ON payments (participant_id);

-- O histórico financeiro passa a registrar o status devolvido pelo provedor
-- e uma descrição legível de cada evento (§40).
ALTER TABLE payment_events
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS description     text;

ALTER TABLE payment_events DROP CONSTRAINT IF EXISTS payment_events_type_check;
ALTER TABLE payment_events ADD CONSTRAINT payment_events_type_check CHECK (
  event_type IN (
    'COBRANCA_CRIADA', 'STATUS_ALTERADO', 'CANCELAMENTO_SOLICITADO',
    'CANCELAMENTO_CONFIRMADO', 'ESTORNO_SOLICITADO', 'ESTORNO_CONFIRMADO',
    'NOTIFICACAO_RECEBIDA', 'RECONCILIACAO',
    'PAYMENT_CREATED', 'PAYMENT_PENDENTE', 'PAYMENT_AGUARDANDO', 'PAYMENT_PAGO',
    'PAYMENT_RECUSADO', 'PAYMENT_CANCELADO', 'PAYMENT_EXPIRADO', 'PAYMENT_ESTORNADO',
    'PAYMENT_REFUNDED', 'PAYMENT_CANCELLED', 'PAYMENT_PROVIDER_FAILED'
  )
);

-- A notificação fica vinculada ao pagamento identificado no processamento (§20).
ALTER TABLE payment_webhook_logs
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_logs_payment_idx ON payment_webhook_logs (payment_id);

-- Cupons: cortesia não consome contador e a reserva precisa saber que o cupom
-- já foi usado por uma inscrição específica (§25).
ALTER TABLE coupon_usages
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE INDEX IF NOT EXISTS coupon_usages_active_idx ON coupon_usages (coupon_id) WHERE released_at IS NULL;
