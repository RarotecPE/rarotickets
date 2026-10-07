"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react";
import {
  ticketingApi,
  type PaginatedAuditLogs,
} from "@/client/services/ticketing-api.service";
import { Dialog } from "@/components/dialog";
import {
  Badge,
  Button,
  Empty,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

type AuditLogItem = PaginatedAuditLogs["items"][number];
const PAGE_SIZE = 20;

export function AuditLogBrowser() {
  const [data, setData] = useState<PaginatedAuditLogs>({ items: [], total: 0 });
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  useEffect(() => {
    let active = true;
    async function loadAuditLog(): Promise<void> {
      try {
        const result = await ticketingApi.getAuditLog({
          query: appliedQuery || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (active) setData(result);
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar a auditoria.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAuditLog();
    return () => {
      active = false;
    };
  }, [appliedQuery, page, reloadVersion]);

  function submitSearch(formEvent: FormEvent<HTMLFormElement>): void {
    formEvent.preventDefault();
    setError(null);
    setLoading(true);
    setPage(1);
    setAppliedQuery(query.trim());
    setReloadVersion((current) => current + 1);
  }

  function retry(): void {
    setError(null);
    setLoading(true);
    setReloadVersion((current) => current + 1);
  }

  const closeDialog = useCallback(() => setSelected(null), []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
          Governança
        </p>
        <h2 className="mt-1 text-xl font-bold text-app-foreground">
          Trilha de auditoria
        </h2>
        <p className="mt-1 text-xs text-app-muted-foreground">
          Registros imutáveis das operações administrativas realizadas no
          sistema.
        </p>
      </div>
      <Panel>
        <PanelHeader
          title="Buscar registros"
          description="Filtre por usuário, ação, entidade ou identificador do registro."
        />
        <form
          onSubmit={submitSearch}
          className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
        >
          <Field label="Busca" htmlFor="audit-query">
            <input
              id="audit-query"
              value={query}
              onChange={(change) => setQuery(change.target.value)}
              className={inputCls}
              placeholder="Ex.: event.created, inscrição ou usuário"
            />
          </Field>
          <Button type="submit">
            <Search className="h-4 w-4" aria-hidden="true" />
            Buscar
          </Button>
        </form>
      </Panel>
      {error ? (
        <InlineAlert
          tone="danger"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          {error}
          <Button compact variant="secondary" onClick={retry}>
            Tentar novamente
          </Button>
        </InlineAlert>
      ) : null}
      {loading ? (
        <Panel>
          <div className="p-5">
            <Spinner label="Carregando registros de auditoria…" />
          </div>
        </Panel>
      ) : error ? null : data.items.length ? (
        <AuditTable items={data.items} onSelect={setSelected} />
      ) : (
        <Panel>
          <div className="p-4 sm:p-5">
            <Empty
              title="Nenhum registro encontrado"
              description="As operações administrativas aparecerão aqui após serem realizadas."
            />
          </div>
        </Panel>
      )}
      {!loading && !error && data.total ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-app-muted-foreground">
            {data.total} registro(s) · Página {page} de {pageCount}
          </p>
          <nav
            className="flex items-center gap-2"
            aria-label="Paginação da auditoria"
          >
            <Button
              type="button"
              compact
              variant="secondary"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(1, current - 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              type="button"
              compact
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.min(pageCount, current + 1));
              }}
            >
              Próxima
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      ) : null}
      <Dialog
        open={Boolean(selected)}
        onClose={closeDialog}
        title="Detalhes da operação"
        description={
          selected
            ? `${selected.action} · ${formatDate({ value: selected.createdAt, withTime: true })}`
            : undefined
        }
        maxWidth="max-w-2xl"
      >
        {selected ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AuditDetail
                label="Usuário"
                value={`${selected.userName} (${selected.userId})`}
              />
              <AuditDetail label="Entidade" value={selected.entity} />
              <AuditDetail label="Identificador" value={selected.recordId} />
              <AuditDetail
                label="IP de origem"
                value={selected.ip ?? "Não informado"}
              />
            </dl>
            <AuditJson label="Dados anteriores" value={selected.beforeData} />
            <AuditJson label="Dados registrados" value={selected.afterData} />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function AuditTable({
  items,
  onSelect,
}: {
  items: AuditLogItem[];
  onSelect: (item: AuditLogItem) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Atividade recente"
        description={`${items.length} nesta página`}
        right={
          <Badge tone="primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Auditável
          </Badge>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left">
          <caption className="sr-only">
            Trilha de auditoria das operações administrativas
          </caption>
          <thead>
            <tr className="border-b border-app-border">
              {["Data", "Usuário", "Ação", "Entidade", "Registro", ""].map(
                (heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground"
                  >
                    {heading || "Detalhes"}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-app-border last:border-0 hover:bg-app-surface-elevated/40"
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-app-muted-foreground">
                  {formatDate({ value: item.createdAt, withTime: true })}
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-40 truncate text-sm font-semibold text-app-foreground">
                    {item.userName}
                  </p>
                  <p className="max-w-40 truncate text-[11px] text-app-muted-foreground">
                    {item.userId}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={actionTone(item.action)}>
                    {humanizeAction(item.action)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-app-muted-foreground">
                  {item.entity}
                </td>
                <td className="max-w-40 truncate px-4 py-3 font-mono text-xs text-app-muted-foreground">
                  {item.recordId}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    compact
                    variant="secondary"
                    onClick={() => onSelect(item)}
                  >
                    Detalhes
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-app-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

function AuditJson({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold text-app-muted-foreground">
        {label}
      </h3>
      <pre className="max-h-56 overflow-auto rounded-app-md border border-app-border bg-app-surface-elevated p-3 font-mono text-[11px] leading-relaxed text-app-foreground">
        {value ? JSON.stringify(value, null, 2) : "Sem dados"}
      </pre>
    </section>
  );
}

function actionTone(
  action: string,
): "success" | "warning" | "danger" | "primary" | "muted" {
  if (action.includes("cancel")) return "danger";
  if (action.includes("checkin")) return "success";
  if (action.includes("created") || action.includes("issued")) return "primary";
  return "muted";
}

function humanizeAction(action: string): string {
  const labels: Record<string, string> = {
    "event.created": "Evento criado",
    "registration.cancelled": "Inscrição cancelada",
    "checkin.created": "Check-in",
    "checkin.reentry": "Reentrada",
    "certificate.batch_issued": "Certificados emitidos",
  };
  return labels[action] ?? action.replaceAll(".", " · ");
}
