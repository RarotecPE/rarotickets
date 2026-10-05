import type {
  DashboardIndicator,
  DashboardResult,
  IReportQueryGateway,
  ReportFilter,
  ReportResult,
} from '@core/contracts/report-query.contract';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';

export type ReportQueryGatewayDependencies = { db: IDatabaseClient };

type AggregateRow = Record<string, string | number | boolean | null>;

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  LISTA_ESPERA: 'Lista de espera',
};

function money(cents: number): string {
  const value = (cents / 100).toFixed(2).replace('.', ',');
  return `R$ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function percent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * Implementação SQL das projeções de relatório (§41 a §43). Nenhum cálculo de
 * regra de negócio acontece aqui: apenas agregações de leitura.
 */
export class ReportQueryGatewayImpl implements IReportQueryGateway {
  private readonly db: IDatabaseClient;

  constructor(dependencies: ReportQueryGatewayDependencies) {
    this.db = dependencies.db;
  }

  private rangeParams(filter: ReportFilter): unknown[] {
    return [filter.eventId ?? null, filter.from ?? null, filter.to ?? null, filter.search ?? null];
  }

  private limitParams(filter: ReportFilter): unknown[] {
    return [filter.perPage, (filter.page - 1) * filter.perPage];
  }

  /**
   * Executa a contagem reaproveitando os parâmetros da consulta principal.
   * A consulta de contagem pode usar apenas parte dos placeholders; por isso os
   * índices são renumerados e apenas os valores realmente referenciados são
   * enviados ao driver (parâmetro sem uso e sem tipo gera erro no PostgreSQL).
   */
  private async withTotal(
    rows: AggregateRow[],
    countSql: string,
    params: unknown[],
  ): Promise<number> {
    if (rows.length < 1) return 0;

    const referenced = [...new Set([...countSql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1])))].sort(
      (left, right) => left - right,
    );
    const mapping = new Map(referenced.map((position, index) => [position, index + 1]));
    const renumbered = countSql.replace(/\$(\d+)/g, (_match, position: string) => `$${mapping.get(Number(position))}`);
    const countParams = referenced.map((position) => params[position - 1]);

    const count = await this.db.queryOne<{ total: string }>({ sql: renumbered, params: countParams });
    return Number(count?.total ?? rows.length);
  }

  async registrationsByEvent(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, e.status AS situacao_evento, e.capacity AS capacidade,
              COUNT(r.id) FILTER (WHERE r.status = 'CONFIRMADA') AS confirmadas,
              COUNT(r.id) FILTER (WHERE r.status = 'AGUARDANDO_PAGAMENTO' OR r.status = 'PENDENTE') AS pendentes,
              COUNT(r.id) FILTER (WHERE r.status = 'LISTA_ESPERA') AS lista_espera,
              COUNT(r.id) FILTER (WHERE r.status = 'CANCELADA') AS canceladas,
              COUNT(r.id) AS total
            FROM events e
            LEFT JOIN registrations r ON r.event_id = e.id
            WHERE ($1::uuid IS NULL OR e.id = $1)
              AND ($2::timestamptz IS NULL OR e.start_date >= $2)
              AND ($3::timestamptz IS NULL OR e.start_date <= $3)
              AND ($4::text IS NULL OR lower(e.title) LIKE '%' || lower($4) || '%')
            GROUP BY e.id, e.title, e.status, e.capacity
            ORDER BY total DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return {
      rows,
      total: await this.withTotal(
        rows,
        `SELECT COUNT(DISTINCT e.id)::text AS total FROM events e WHERE ($1::uuid IS NULL OR e.id = $1)
           AND ($4::text IS NULL OR lower(e.title) LIKE '%' || lower($4) || '%')`,
        params,
      ),
      summary: {},
    };
  }

  async attendanceList(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, r.code AS inscricao, p.name AS participante, p.email AS email,
              p.cpf AS cpf, r.status AS situacao, (ci.checked_in_at IS NOT NULL) AS presente,
              ci.checked_in_at AS check_in, ci.operator_name AS operador
            FROM registrations r
            JOIN participants p ON p.id = r.participant_id
            JOIN events e ON e.id = r.event_id
            LEFT JOIN check_ins ci ON ci.registration_id = r.id
            WHERE ($1::uuid IS NULL OR r.event_id = $1)
              AND ($2::timestamptz IS NULL OR r.created_at >= $2)
              AND ($3::timestamptz IS NULL OR r.created_at <= $3)
              AND ($4::text IS NULL OR lower(p.name) LIKE '%' || lower($4) || '%' OR lower(r.code) LIKE '%' || lower($4) || '%')
              AND r.status IN ('CONFIRMADA', 'CANCELADA')
            ORDER BY e.title, p.name
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    const summary = await this.db.queryOne<AggregateRow>({
      sql: `SELECT COUNT(*)::text AS total, COUNT(ci.id)::text AS presentes
            FROM registrations r
            LEFT JOIN check_ins ci ON ci.registration_id = r.id
            WHERE ($1::uuid IS NULL OR r.event_id = $1)`,
      params: [filter.eventId ?? null],
    });

    const total = Number(summary?.total ?? rows.length);
    const presentes = Number(summary?.presentes ?? 0);
    return {
      rows,
      total,
      summary: { total, presentes, ausentes: Math.max(total - presentes, 0) },
    };
  }

  async checkIns(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, COUNT(ci.id) AS check_ins,
              COUNT(ci.id) FILTER (WHERE ci.method = 'QR_CODE') AS via_qrcode,
              COUNT(ci.id) FILTER (WHERE ci.is_override) AS com_justificativa
            FROM check_ins ci
            JOIN events e ON e.id = ci.event_id
            WHERE ($1::uuid IS NULL OR ci.event_id = $1)
              AND ($2::timestamptz IS NULL OR ci.checked_in_at >= $2)
              AND ($3::timestamptz IS NULL OR ci.checked_in_at <= $3)
              AND ($4::text IS NULL OR lower(e.title) LIKE '%' || lower($4) || '%')
            GROUP BY e.id, e.title
            ORDER BY check_ins DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return { rows, total: rows.length, summary: {} };
  }

  async registrationFunnel(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT r.status AS situacao, COUNT(*) AS total,
              COALESCE(SUM(r.final_amount_cents), 0)::text AS valor_total_centavos
            FROM registrations r
            JOIN events e ON e.id = r.event_id
            WHERE ($1::uuid IS NULL OR r.event_id = $1)
              AND ($2::timestamptz IS NULL OR r.created_at >= $2)
              AND ($3::timestamptz IS NULL OR r.created_at <= $3)
              AND ($4::text IS NULL OR lower(e.title) LIKE '%' || lower($4) || '%')
            GROUP BY r.status
            ORDER BY total DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return {
      rows: rows.map((row) => ({
        ...row,
        situacaoLabel: STATUS_LABELS[String(row.situacao)] ?? String(row.situacao),
      })),
      total: rows.reduce((accumulator, row) => accumulator + Number(row.total ?? 0), 0),
      summary: {},
    };
  }

  async paymentsByPeriod(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT to_char(date_trunc('day', pay.created_at), 'DD/MM/YYYY') AS data,
              COUNT(*) AS pagamentos,
              COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status = 'PAGO'), 0) AS pago_centavos,
              COALESCE(SUM(pay.amount_cents) FILTER (WHERE pay.status IN ('PENDENTE', 'AGUARDANDO')), 0) AS pendente_centavos,
              COALESCE(SUM(pay.refunded_cents), 0) AS estornado_centavos
            FROM payments pay
            WHERE ($1::uuid IS NULL OR pay.event_id = $1)
              AND ($2::timestamptz IS NULL OR pay.created_at >= $2)
              AND ($3::timestamptz IS NULL OR pay.created_at <= $3)
              AND ($4::text IS NULL OR lower(pay.reference) LIKE '%' || lower($4) || '%')
            GROUP BY date_trunc('day', pay.created_at)
            ORDER BY date_trunc('day', pay.created_at) DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    const summary = rows.reduce<{ pagoCentavos: number; pendenteCentavos: number; estornadoCentavos: number }>(
      (accumulator, row) => ({
        pagoCentavos: accumulator.pagoCentavos + Number(row.pago_centavos ?? 0),
        pendenteCentavos: accumulator.pendenteCentavos + Number(row.pendente_centavos ?? 0),
        estornadoCentavos: accumulator.estornadoCentavos + Number(row.estornado_centavos ?? 0),
      }),
      { pagoCentavos: 0, pendenteCentavos: 0, estornadoCentavos: 0 },
    );

    return {
      rows,
      total: rows.length,
      summary: {
        ...summary,
        pagoFormatado: money(summary.pagoCentavos),
        pendenteFormatado: money(summary.pendenteCentavos),
        estornadoFormatado: money(summary.estornadoCentavos),
      },
    };
  }

  async openPayments(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT pay.reference AS referencia, pay.method AS forma, pay.status AS situacao,
              pay.amount_cents AS valor_centavos, pay.expires_at AS expira_em, e.title AS evento,
              p.name AS participante
            FROM payments pay
            JOIN events e ON e.id = pay.event_id
            LEFT JOIN participants p ON p.id = pay.participant_id
            WHERE pay.status IN ('PENDENTE', 'AGUARDANDO', 'EXPIRADO')
              AND ($1::uuid IS NULL OR pay.event_id = $1)
              AND ($2::timestamptz IS NULL OR pay.created_at >= $2)
              AND ($3::timestamptz IS NULL OR pay.created_at <= $3)
              AND ($4::text IS NULL OR lower(pay.reference) LIKE '%' || lower($4) || '%')
            ORDER BY pay.expires_at NULLS LAST
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return {
      rows,
      total: rows.length,
      summary: {
        emAbertoCentavos: rows
          .filter((row) => row.situacao !== 'EXPIRADO')
          .reduce<number>((accumulator, row) => accumulator + Number(row.valor_centavos ?? 0), 0),
      },
    };
  }

  async refunds(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT pay.reference AS referencia, pay.refunded_cents AS estornado_centavos,
              pay.refund_reason AS motivo, pay.refunded_at AS estornado_em, e.title AS evento,
              p.name AS participante
            FROM payments pay
            JOIN events e ON e.id = pay.event_id
            LEFT JOIN participants p ON p.id = pay.participant_id
            WHERE pay.status = 'ESTORNADO'
              AND ($1::uuid IS NULL OR pay.event_id = $1)
              AND ($2::timestamptz IS NULL OR pay.refunded_at >= $2)
              AND ($3::timestamptz IS NULL OR pay.refunded_at <= $3)
              AND ($4::text IS NULL OR lower(pay.reference) LIKE '%' || lower($4) || '%')
            ORDER BY pay.refunded_at DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    const totalCents = rows.reduce<number>((accumulator, row) => accumulator + Number(row.estornado_centavos ?? 0), 0);
    return { rows, total: rows.length, summary: { totalCentavos: totalCents, totalFormatado: money(totalCents) } };
  }

  async couponUsage(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT c.code AS cupom, c.type AS tipo, COUNT(cu.id) AS usos,
              COALESCE(SUM(cu.discount_cents), 0) AS desconto_centavos,
              c.max_uses AS limite, c.used_count AS usados
            FROM coupons c
            LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id AND cu.released_at IS NULL
            JOIN events e ON e.id = c.event_id
            WHERE ($1::uuid IS NULL OR c.event_id = $1)
              AND ($2::timestamptz IS NULL OR c.created_at >= $2)
              AND ($3::timestamptz IS NULL OR c.created_at <= $3)
              AND ($4::text IS NULL OR lower(c.code) LIKE '%' || lower($4) || '%')
            GROUP BY c.id, c.code, c.type, c.max_uses, c.used_count
            ORDER BY usos DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    const discountCents = rows.reduce<number>((accumulator, row) => accumulator + Number(row.desconto_centavos ?? 0), 0);
    return {
      rows,
      total: rows.length,
      summary: { descontoCentavos: discountCents, descontoFormatado: money(discountCents) },
    };
  }

  async waitlist(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, r.waitlist_position AS posicao, r.code AS inscricao,
              p.name AS participante, p.email AS email, r.created_at AS inscrito_em
            FROM registrations r
            JOIN participants p ON p.id = r.participant_id
            JOIN events e ON e.id = r.event_id
            WHERE r.status = 'LISTA_ESPERA'
              AND ($1::uuid IS NULL OR r.event_id = $1)
              AND ($2::timestamptz IS NULL OR r.created_at >= $2)
              AND ($3::timestamptz IS NULL OR r.created_at <= $3)
              AND ($4::text IS NULL OR lower(p.name) LIKE '%' || lower($4) || '%')
            ORDER BY e.title, r.waitlist_position
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return { rows, total: rows.length, summary: { aguardando: rows.length } };
  }

  async participantsByLocation(filter: ReportFilter): Promise<ReportResult> {
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT COALESCE(p.city, 'Não informado') AS cidade, COALESCE(p.state, '--') AS estado,
              COUNT(*) AS participantes
            FROM participants p
            WHERE ($2::text IS NULL OR lower(p.name) LIKE '%' || lower($2) || '%'
                   OR lower(coalesce(p.city, '')) LIKE '%' || lower($2) || '%')
              AND ($1::uuid IS NULL OR EXISTS (
                SELECT 1 FROM registrations r WHERE r.participant_id = p.id AND r.event_id = $1
              ))
            GROUP BY p.city, p.state
            ORDER BY participantes DESC
            LIMIT $3 OFFSET $4`,
      params: [filter.eventId ?? null, filter.search ?? null, filter.perPage, (filter.page - 1) * filter.perPage],
    });

    return { rows, total: rows.length, summary: {} };
  }

  async certificatesIssued(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, COUNT(c.id) AS certificados,
              COUNT(c.id) FILTER (WHERE c.revoked_at IS NULL) AS emitidos,
              COUNT(c.id) FILTER (WHERE c.revoked_at IS NOT NULL) AS cancelados
            FROM certificates c
            JOIN events e ON e.id = c.event_id
            WHERE ($1::uuid IS NULL OR c.event_id = $1)
              AND ($2::timestamptz IS NULL OR c.issued_at >= $2)
              AND ($3::timestamptz IS NULL OR c.issued_at <= $3)
              AND ($4::text IS NULL OR lower(e.title) LIKE '%' || lower($4) || '%')
            GROUP BY e.id, e.title
            ORDER BY certificados DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return { rows, total: rows.length, summary: {} };
  }

  async revenueByLote(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT e.title AS evento, COALESCE(r.lote_name, 'Sem lote') AS lote,
              COUNT(*) AS inscricoes,
              COUNT(*) FILTER (WHERE r.status = 'CONFIRMADA') AS confirmadas,
              COALESCE(SUM(r.final_amount_cents) FILTER (WHERE r.status = 'CONFIRMADA'), 0) AS receita_centavos
            FROM registrations r
            JOIN events e ON e.id = r.event_id
            WHERE ($1::uuid IS NULL OR r.event_id = $1)
              AND ($2::timestamptz IS NULL OR r.created_at >= $2)
              AND ($3::timestamptz IS NULL OR r.created_at <= $3)
              AND ($4::text IS NULL OR lower(coalesce(r.lote_name, '')) LIKE '%' || lower($4) || '%')
            GROUP BY e.id, e.title, r.lote_name
            ORDER BY receita_centavos DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    const revenueCents = rows.reduce<number>((accumulator, row) => accumulator + Number(row.receita_centavos ?? 0), 0);
    return {
      rows,
      total: rows.length,
      summary: { receitaCentavos: revenueCents, receitaFormatada: money(revenueCents) },
    };
  }

  async communications(filter: ReportFilter): Promise<ReportResult> {
    const params = this.rangeParams(filter);
    const rows = await this.db.query<AggregateRow>({
      sql: `SELECT cl.template AS modelo, cl.channel AS canal, cl.status AS situacao, COUNT(*) AS total
            FROM communication_logs cl
            WHERE ($1::uuid IS NULL OR cl.event_id = $1)
              AND ($2::timestamptz IS NULL OR cl.created_at >= $2)
              AND ($3::timestamptz IS NULL OR cl.created_at <= $3)
              AND ($4::text IS NULL OR lower(cl.template) LIKE '%' || lower($4) || '%')
            GROUP BY cl.template, cl.channel, cl.status
            ORDER BY total DESC
            LIMIT $5 OFFSET $6`,
      params: [...params, ...this.limitParams(filter)],
    });

    return { rows, total: rows.length, summary: {} };
  }

  async dashboard(filter: ReportFilter): Promise<DashboardResult> {
    const eventId = filter.eventId ?? null;
    const row = await this.db.queryOne<AggregateRow>({
      sql: `SELECT
        (SELECT COUNT(*) FROM events WHERE $1::uuid IS NULL OR id = $1)::text AS total_eventos,
        (SELECT COUNT(*) FROM events
          WHERE start_date >= now() AND status NOT IN ('CANCELADO', 'FINALIZADO')
            AND ($1::uuid IS NULL OR id = $1))::text AS proximos_eventos,
        (SELECT COUNT(*) FROM registrations WHERE ($1::uuid IS NULL OR event_id = $1))::text AS total_inscritos,
        (SELECT COUNT(*) FROM registrations WHERE status = 'CONFIRMADA' AND ($1::uuid IS NULL OR event_id = $1))::text AS confirmadas,
        (SELECT COUNT(*) FROM registrations
          WHERE status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO') AND ($1::uuid IS NULL OR event_id = $1))::text AS pagamentos_pendentes,
        (SELECT COALESCE(SUM(capacity), 0) FROM events
          WHERE status <> 'CANCELADO' AND ($1::uuid IS NULL OR id = $1))::text AS capacidade_total,
        (SELECT COUNT(*) FROM registrations
          WHERE seat_status IN ('OCUPADA', 'RESERVADA') AND ($1::uuid IS NULL OR event_id = $1))::text AS vagas_tomadas,
        (SELECT COALESCE(SUM(final_amount_cents) FILTER (
            WHERE status IN ('CONFIRMADA', 'PENDENTE', 'AGUARDANDO_PAGAMENTO')), 0)
          FROM registrations WHERE ($1::uuid IS NULL OR event_id = $1))::text AS receita_prevista,
        (SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status = 'PAGO'), 0)
          FROM payments WHERE ($1::uuid IS NULL OR event_id = $1))::text AS receita_recebida,
        (SELECT COUNT(*) FROM check_ins WHERE ($1::uuid IS NULL OR event_id = $1))::text AS presentes`,
      params: [eventId],
    });

    const number = (key: string): number => Number(row?.[key] ?? 0);
    const confirmed = number('confirmadas');
    const freeSeats = Math.max(number('capacidade_total') - number('vagas_tomadas'), 0);
    const attendance = confirmed > 0 ? (number('presentes') / confirmed) * 100 : 0;

    // Indicadores exigidos pelo documento de regras (§34).
    const indicators: DashboardIndicator[] = [
      {
        key: 'quantidade_eventos',
        label: 'Quantidade de eventos',
        value: number('total_eventos'),
        formatted: String(number('total_eventos')),
        hint: null,
      },
      {
        key: 'proximos_eventos',
        label: 'Próximos eventos',
        value: number('proximos_eventos'),
        formatted: String(number('proximos_eventos')),
        hint: 'Com data de início a partir de hoje',
      },
      {
        key: 'total_inscritos',
        label: 'Total de inscritos',
        value: number('total_inscritos'),
        formatted: String(number('total_inscritos')),
        hint: 'Todas as inscrições registradas',
      },
      {
        key: 'inscricoes_confirmadas',
        label: 'Inscrições confirmadas',
        value: confirmed,
        formatted: String(confirmed),
        hint: null,
      },
      {
        key: 'vagas_restantes',
        label: 'Vagas restantes',
        value: freeSeats,
        formatted: String(freeSeats),
        hint: 'Capacidade livre considerando reservas ativas',
      },
      {
        key: 'pagamentos_pendentes',
        label: 'Pagamentos pendentes',
        value: number('pagamentos_pendentes'),
        formatted: String(number('pagamentos_pendentes')),
        hint: 'Inscrições pendentes ou aguardando pagamento',
      },
      {
        key: 'receita_prevista',
        label: 'Receita prevista',
        value: number('receita_prevista'),
        formatted: money(number('receita_prevista')),
        hint: 'Valores das inscrições ainda ativas',
      },
      {
        key: 'receita_recebida',
        label: 'Receita recebida',
        value: number('receita_recebida'),
        formatted: money(number('receita_recebida')),
        hint: 'Pagamentos confirmados',
      },
      {
        key: 'presentes',
        label: 'Quantidade de presentes',
        value: number('presentes'),
        formatted: String(number('presentes')),
        hint: 'Check-ins registrados',
      },
      {
        key: 'taxa_comparecimento',
        label: 'Taxa de comparecimento',
        value: attendance,
        formatted: percent(attendance),
        hint: 'Presentes sobre inscrições confirmadas',
      },
    ];

    return { indicators, updatedAt: new Date() };
  }
}
