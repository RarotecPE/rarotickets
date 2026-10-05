-- =============================================================================
-- 0007 — Controle de ocupação de vagas (visão) e índices de apoio
-- Regras de negócio: §3 (capacidade e concorrência), §26 (lista de espera)
--
-- A contagem de vagas é sempre derivada das inscrições:
--   OCUPADA  -> status CONFIRMADA (inscrição confirmada ocupa vaga)
--   RESERVADA-> status PENDENTE/AGUARDANDO_PAGAMENTO com reserva vigente
--   LISTA_ESPERA e CANCELADA não ocupam vaga
-- A concorrência é resolvida com SELECT ... FOR UPDATE na linha do evento,
-- garantindo que duas inscrições simultâneas não ultrapassem a capacidade.
-- =============================================================================

CREATE OR REPLACE VIEW event_seat_usage AS
SELECT
  e.id                                                        AS event_id,
  e.capacity                                                  AS capacity,
  COALESCE(seats.occupied, 0)                                 AS occupied_seats,
  COALESCE(seats.reserved, 0)                                 AS reserved_seats,
  COALESCE(seats.waitlist, 0)                                 AS waitlist_count,
  GREATEST(e.capacity - COALESCE(seats.occupied, 0) - COALESCE(seats.reserved, 0), 0) AS available_seats
FROM events e
LEFT JOIN (
  SELECT
    r.event_id,
    COUNT(*) FILTER (WHERE r.status = 'CONFIRMADA' OR r.seat_status = 'OCUPADA') AS occupied,
    COUNT(*) FILTER (
      WHERE r.status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO')
        AND r.seat_status = 'RESERVADA'
        AND (r.reservation_expires_at IS NULL OR r.reservation_expires_at > now())
    ) AS reserved,
    COUNT(*) FILTER (WHERE r.status = 'LISTA_ESPERA') AS waitlist
  FROM registrations r
  GROUP BY r.event_id
) seats ON seats.event_id = e.id;

-- Consumo de lotes é sempre derivado das inscrições que usaram o lote (§5).
CREATE OR REPLACE VIEW event_lote_usage AS
SELECT
  l.id            AS lote_id,
  l.event_id      AS event_id,
  l.max_quantity  AS max_quantity,
  COALESCE(usage.sold, 0) AS sold_quantity,
  GREATEST(l.max_quantity - COALESCE(usage.sold, 0), 0) AS available_quantity
FROM event_lotes l
LEFT JOIN (
  SELECT r.lote_id, COUNT(*) AS sold
  FROM registrations r
  WHERE r.lote_id IS NOT NULL
    AND r.status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA')
  GROUP BY r.lote_id
) usage ON usage.lote_id = l.id;

CREATE INDEX IF NOT EXISTS registrations_event_lote_idx ON registrations (event_id, lote_id);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS registrations_confirmed_at_idx ON registrations (event_id, confirmed_at);
CREATE INDEX IF NOT EXISTS payment_events_created_at_idx ON payment_events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_active_idx ON events (status, start_date)
  WHERE status NOT IN ('CANCELADO', 'FINALIZADO');
