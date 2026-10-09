"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, Download, Search } from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type { RevenueReport } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";
import {
  Badge,
  Button,
  Empty,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  Stat,
  inputCls,
  selectCls,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

type ReportFilters = { eventId: string; from: string; to: string };

export function ReportsDashboard() {
  const [events, setEvents] = useState<EventReadModel[]>([]);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [eventId, setEventId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<ReportFilters>({
    eventId: "",
    from: "",
    to: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadReport(): Promise<void> {
      try {
        const [reportData, eventData] = await Promise.all([
          ticketingApi.getReport({
            eventId: filters.eventId || undefined,
            from: filters.from
              ? new Date(`${filters.from}T00:00:00`)
              : undefined,
            to: filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined,
          }),
          ticketingApi.listManagedEvents(),
        ]);
        if (active) {
          setReport(reportData);
          setEvents(eventData);
        }
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar o relatório.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReport();
    return () => {
      active = false;
    };
  }, [filters, reloadVersion]);

  function submitFilters(formEvent: FormEvent<HTMLFormElement>): void {
    formEvent.preventDefault();
    setError(null);
    if (from && to && from > to) {
      setError("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setLoading(true);
    setFilters({ eventId, from, to });
    setReloadVersion((current) => current + 1);
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadVersion((current) => current + 1);
  }

  function exportCsv(): void {
    if (!report) return;
    const rows = [
      ["Indicador", "Valor"],
      ["Inscrições", String(report.totalRegistrations)],
      ["Confirmadas", String(report.confirmed)],
      ["Aguardando", String(report.waiting)],
      ["Lista de espera", String(report.waitlisted)],
      ["Canceladas", String(report.cancelled)],
      ["Receita paga (centavos)", String(report.paidCents)],
      ["Receita prevista (centavos)", String(report.expectedCents)],
      ["Presença (%)", String(report.attendanceRate)],
      ["", ""],
      ["Empresa", "Inscrições"],
      ...report.byCompany.map((item) => [item.company, String(item.count)]),
    ];
    const csv = rows
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rarotickets-relatorio.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
            Análise
          </p>
          <h2 className="mt-1 text-xl font-bold text-app-foreground">
            Relatórios
          </h2>
          <p className="mt-1 text-xs text-app-muted-foreground">
            Acompanhe inscrições, faturamento e presença dos eventos.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!report}
          onClick={exportCsv}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Exportar CSV
        </Button>
      </div>
      <Panel>
        <PanelHeader
          title="Filtros do relatório"
          description="Os dados respeitam o escopo dos eventos autorizados para seu perfil."
        />
        <form
          onSubmit={submitFilters}
          className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_200px_auto] sm:p-5"
        >
          <Field label="Evento" htmlFor="report-event">
            <select
              id="report-event"
              value={eventId}
              onChange={(change) => setEventId(change.target.value)}
              className={selectCls}
            >
              <option value="">Todos os eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.props.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="De" htmlFor="report-from">
            <input
              id="report-from"
              type="date"
              value={from}
              onChange={(change) => setFrom(change.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Até" htmlFor="report-to">
            <input
              id="report-to"
              type="date"
              value={to}
              onChange={(change) => setTo(change.target.value)}
              className={inputCls}
            />
          </Field>
          <Button type="submit">
            <Search className="h-4 w-4" aria-hidden="true" />
            Aplicar
          </Button>
        </form>
      </Panel>
      {error ? (
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {error}
          {error.startsWith("A data inicial") ? null : (
            <Button compact variant="secondary" onClick={retry}>
              Tentar novamente
            </Button>
          )}
        </InlineAlert>
      ) : null}
      {loading ? (
        <div className="p-2">
          <Spinner label="Calculando relatório…" />
        </div>
      ) : error ? null : report ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Total de inscrições"
              value={report.totalRegistrations}
              tone="primary"
            />
            <Stat label="Confirmadas" value={report.confirmed} tone="success" />
            <Stat
              label="Em aberto"
              value={report.waiting}
              hint={`${report.waitlisted} em lista de espera`}
              tone="warning"
            />
            <Stat label="Canceladas" value={report.cancelled} tone="danger" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
            <RevenuePanel report={report} />
            <CompaniesPanel report={report} />
          </div>
        </>
      ) : (
        <Panel>
          <div className="p-5">
            <Empty
              title="Relatório indisponível"
              description="Não há dados que correspondam aos filtros selecionados."
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

function RevenuePanel({ report }: { report: RevenueReport }) {
  return (
    <Panel>
      <PanelHeader
        title="Receita e presença"
        description="Valores calculados a partir das inscrições e pagamentos registrados."
        right={
          <Badge tone="primary">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Resumo
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <RevenueMetric
          label="Receita recebida"
          value={formatCurrency({ cents: report.paidCents })}
          tone="success"
        />
        <RevenueMetric
          label="Receita prevista"
          value={formatCurrency({ cents: report.expectedCents })}
          tone="primary"
        />
        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-app-muted-foreground">
                Taxa de presença
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-app-foreground">
                {formatPercent(report.attendanceRate)}%
              </p>
            </div>
            <Badge tone={report.attendanceRate >= 70 ? "success" : "warning"}>
              {report.confirmed} confirmadas
            </Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-app-pill bg-app-surface">
            <div
              className="h-full rounded-app-pill bg-app-success"
              style={{
                width: `${Math.max(0, Math.min(100, report.attendanceRate))}%`,
              }}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RevenueMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "primary";
}) {
  return (
    <div className="rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4">
      <p className="text-xs text-app-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-xl font-bold tabular-nums ${tone === "success" ? "text-app-success" : "text-app-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function CompaniesPanel({ report }: { report: RevenueReport }) {
  const maximum = Math.max(1, ...report.byCompany.map((item) => item.count));
  return (
    <Panel>
      <PanelHeader
        title="Inscrições por empresa"
        description="Até 10 empresas com mais inscrições."
      />
      {report.byCompany.length ? (
        <div className="space-y-4 p-4 sm:p-5">
          {report.byCompany.map((item) => (
            <div key={item.company}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-medium text-app-foreground">
                  {item.company}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-app-muted-foreground">
                  {item.count}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-app-pill bg-app-surface-elevated"
                role="progressbar"
                aria-label={`Inscrições de ${item.company}`}
                aria-valuemin={0}
                aria-valuemax={maximum}
                aria-valuenow={item.count}
              >
                <div
                  className="h-full rounded-app-pill bg-app-primary"
                  style={{
                    width: `${Math.max(2, (item.count / maximum) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <Empty
            title="Sem dados por empresa"
            description="As inscrições com empresa informada aparecerão aqui."
          />
        </div>
      )}
    </Panel>
  );
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    value,
  );
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
